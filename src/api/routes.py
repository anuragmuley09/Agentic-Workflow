from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from pydantic import BaseModel
from core.config import settings
from agent.graph import agent_graph
from db.models import User
from langchain_core.messages import HumanMessage
from typing import List, Dict, Any
from db.models import Transaction, BudgetGoal

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
    
    tx_result = await session.execute(tx_stmt)
    goal_result = await session.execute(goal_stmt)
    
    transactions = tx_result.scalars().all()
    goals = goal_result.scalars().all()
    
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
        ]
    }