from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from pydantic import BaseModel
from core.config import settings
from agent.graph import agent_graph
from db.models import User, Statement, ExpenseAlert, FinancialPlan
from langchain_core.messages import HumanMessage
from typing import List, Dict, Any
from db.models import Transaction, BudgetGoal
import shutil
import tempfile
import os
from datetime import date
from agent.preprocessing import parse_csv_statement, parse_pdf_statement

router = APIRouter()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db_session():
    async with AsyncSessionLocal() as session:
        yield session

class AgentQueryRequest(BaseModel):
    user_id: str
    message: str

class AgentQueryResponse(BaseModel):
    messages: List[Dict[str, Any]]
    metrics: Dict[str, Any]

@router.post("/query", response_model=AgentQueryResponse)
async def execute_agent_query(payload: AgentQueryRequest, session: AsyncSession = Depends(get_db_session)):
    try:
        # Auto-register user to satisfy Foreign Key constraints
        user_result = await session.execute(select(User).where(User.id == payload.user_id))
        if not user_result.scalars().first():
            session.add(User(id=payload.user_id, email=f"{payload.user_id}@local.dev"))
            await session.commit()

        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "user_id": payload.user_id,
            "metrics": {},
            "retrieved_context": [],
            "errors": []
        }
        
        final_state = await agent_graph.ainvoke(initial_state)
        
        formatted_messages = []
        for msg in final_state["messages"]:
            formatted_messages.append({
                "role": "system" if msg.type == "system" else ("assistant" if msg.type == "ai" else "user"),
                "content": str(msg.content)
            })
            
        return AgentQueryResponse(
            messages=formatted_messages,
            metrics=final_state.get("metrics", {})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent runtime failure: {str(e)}")
    

@router.get("/users/{user_id}/dashboard")
async def get_user_dashboard(user_id: str, session: AsyncSession = Depends(get_db_session)):
    """Fetches the current state of the user's finances directly from PostgreSQL for the UI."""
    tx_stmt = select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.created_at.desc())
    goal_stmt = select(BudgetGoal).where(BudgetGoal.user_id == user_id)
    alert_stmt = select(ExpenseAlert).where(ExpenseAlert.user_id == user_id).order_by(ExpenseAlert.created_at.desc())
    plan_stmt = select(FinancialPlan).where(FinancialPlan.user_id == user_id).order_by(FinancialPlan.created_at.desc()).limit(1)
    
    tx_result = await session.execute(tx_stmt)
    goal_result = await session.execute(goal_stmt)
    alert_result = await session.execute(alert_stmt)
    plan_result = await session.execute(plan_stmt)
    
    transactions = tx_result.scalars().all()
    goals = goal_result.scalars().all()
    alerts = alert_result.scalars().all()
    latest_plan = plan_result.scalars().first()
    
    # Calculate basic metrics for the frontend charts
    total_income = sum(t.amount for t in transactions if t.direction == "credit")
    total_expense = sum(t.amount for t in transactions if t.direction == "debit")
    
    return {
        "user_id": user_id,
        "metrics": {
            "monthly_income": total_income,
            "total_expenses": total_expense,
            "net_cashflow": total_income - total_expense
        },
        "transactions": [
            {
                "id": t.id,
                "date": str(t.transaction_date),
                "description": t.description,
                "amount": t.amount,
                "direction": t.direction,
                "category": t.category
            } for t in transactions
        ],
        "goals": [
            {
                "id": g.id,
                "name": g.name,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "variance": g.target_amount - g.current_amount
            } for g in goals
        ],
        "alerts": [
            {
                "id": a.id,
                "category": a.category,
                "threshold": a.threshold,
                "trigger_date": str(a.trigger_date)
            } for a in alerts
        ],
        "latest_plan": {
            "recommendations": latest_plan.recommendations,
            "create_date": str(latest_plan.create_date)
        } if latest_plan else None
    }


@router.post("/statements/upload")
async def upload_statement(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session)
):
    # Ensure user exists (auto-register if not)
    user_result = await session.execute(select(User).where(User.id == user_id))
    if not user_result.scalars().first():
        session.add(User(id=user_id, email=f"{user_id}@local.dev"))
        await session.commit()
        
    filename = file.filename or "statement"
    file_ext = os.path.splitext(filename)[1].lower()
    
    # Save UploadFile to a temporary file on disk for pdfplumber/csv processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
        
    try:
        if file_ext == ".csv":
            raw_txs = parse_csv_statement(tmp_path)
            source_type = "CSV"
        elif file_ext == ".pdf":
            raw_txs = parse_pdf_statement(tmp_path)
            source_type = "PDF"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a CSV or PDF statement.")
            
        # Create Statement record
        db_statement = Statement(
            user_id=user_id,
            source_type=source_type,
            period="Monthly Statement",
            generated_date=date.today()
        )
        session.add(db_statement)
        await session.flush() # get the statement ID
        
        imported_count = 0
        imported_txs = []
        
        for tx in raw_txs:
            # Check for duplicates in database before inserting
            stmt = select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.transaction_date == date.fromisoformat(tx["date"]),
                Transaction.description == tx["description"],
                Transaction.amount == tx["amount"],
                Transaction.direction == tx["direction"]
            )
            existing = await session.execute(stmt)
            if existing.scalars().first():
                continue
                
            db_tx = Transaction(
                user_id=user_id,
                transaction_date=date.fromisoformat(tx["date"]),
                description=tx["description"],
                amount=tx["amount"],
                direction=tx["direction"],
                category="Other" # We will let the semantic categorizer classify this later, or use parsed category if available
            )
            session.add(db_tx)
            imported_count += 1
            imported_txs.append(tx)
            
        await session.commit()
        return {
            "status": "success",
            "message": f"Successfully processed statement. Imported {imported_count} new transactions.",
            "statement_id": db_statement.id,
            "imported_count": imported_count,
            "transactions": imported_txs
        }
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process statement: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


class ManualTransactionRequest(BaseModel):
    user_id: str
    date: str
    description: str
    amount: float
    direction: str
    category: str


@router.post("/transactions")
async def add_manual_transaction(payload: ManualTransactionRequest, session: AsyncSession = Depends(get_db_session)):
    try:
        # Create transaction record in PostgreSQL
        db_tx = Transaction(
            user_id=payload.user_id,
            transaction_date=date.fromisoformat(payload.date),
            description=payload.description,
            amount=payload.amount,
            direction=payload.direction,
            category=payload.category
        )
        session.add(db_tx)
        await session.commit()

        # Trigger multi-agent pipeline to calculate goal pacing and run anomalies tests
        event_message = (
            f"SYSTEM_EVENT: Manual transaction added. "
            f"Description: '{payload.description}', Amount: {payload.amount}, "
            f"Category: '{payload.category}', Direction: {payload.direction}."
        )
        initial_state = {
            "messages": [HumanMessage(content=event_message)],
            "user_id": payload.user_id,
            "metrics": {},
            "retrieved_context": [],
            "errors": [],
            "statement_id": "",
            "extracted_transactions": [],
            "analyzed_transactions": [],
            "goal_status": [],
            "alerts": [],
            "financial_plan": {}
        }
        await agent_graph.ainvoke(initial_state)

        return {"status": "success", "message": "Manual transaction successfully registered with agent systems."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record transaction: {str(e)}")


class GoalContributionRequest(BaseModel):
    amount: float


@router.post("/goals/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, payload: GoalContributionRequest, session: AsyncSession = Depends(get_db_session)):
    try:
        # Fetch the goal
        goal_result = await session.execute(select(BudgetGoal).where(BudgetGoal.id == goal_id))
        goal = goal_result.scalars().first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
            
        # Determine transaction type based on goal name
        is_savings = "save" in goal.name.lower() or "saving" in goal.name.lower()
        direction = "credit" if is_savings else "debit"
        desc = f"Savings contribution for {goal.name}" if is_savings else f"Payment towards {goal.name}"
        
        # Insert a Transaction to count towards this goal in the agent's historical ledger
        db_tx = Transaction(
            user_id=goal.user_id,
            transaction_date=date.today(),
            description=desc,
            amount=payload.amount,
            direction=direction,
            category="Other"
        )
        session.add(db_tx)
        
        # Update goal's current_amount immediately
        goal.current_amount += payload.amount
        session.add(goal)
        await session.commit()
        
        # Trigger the LangGraph multi-agent pipeline asynchronously to update metrics/anomalies/nudges
        event_message = (
            f"SYSTEM_EVENT: Manual goal contribution added. "
            f"Goal: '{goal.name}', Amount: {payload.amount}, "
            f"Direction: {direction}."
        )
        initial_state = {
            "messages": [HumanMessage(content=event_message)],
            "user_id": goal.user_id,
            "metrics": {},
            "retrieved_context": [],
            "errors": [],
            "statement_id": "",
            "extracted_transactions": [],
            "analyzed_transactions": [],
            "goal_status": [],
            "alerts": [],
            "financial_plan": {}
        }
        await agent_graph.ainvoke(initial_state)
        
        return {"status": "success", "message": f"Successfully contributed ₹{payload.amount} to '{goal.name}'."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record goal contribution: {str(e)}")