from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from api.routes import get_db_session
from agent.graph import agent_graph
from langchain_core.messages import HumanMessage
from db.models import Transaction
from datetime import date

router = APIRouter()

class SimulatedTransaction(BaseModel):
    user_id: str
    amount: float
    merchant: str
    category: str
    direction: str = "debit"


async def _run_agent_pipeline(initial_state: dict):
    """Run the multi-agent pipeline in the background."""
    try:
        await agent_graph.ainvoke(initial_state)
    except Exception as e:
        print(f"[BACKGROUND] Agent pipeline error: {e}")


@router.post("/plaid/simulate")
async def simulate_plaid_webhook(
    payload: SimulatedTransaction,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session)
):
    # Save simulated transaction to Postgres first so multi-agent flow can ingest it
    db_tx = Transaction(
        user_id=payload.user_id,
        transaction_date=date.today(),
        description=payload.merchant,
        amount=payload.amount,
        direction=payload.direction,
        category=payload.category
    )
    session.add(db_tx)
    await session.commit()

    event_message = (
        f"SYSTEM_EVENT: Real-time transaction received. "
        f"Merchant: '{payload.merchant}', Amount: {payload.amount}, "
        f"Category: '{payload.category}', Direction: {payload.direction}. "
        f"Evaluate goal variance and synthesize a direct nudge if this jeopardizes targets."
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

    # Fire and forget — UI returns instantly, agent runs in background
    background_tasks.add_task(_run_agent_pipeline, initial_state)

    return {"status": "processed", "nudge": f"Transaction recorded: {payload.merchant} ₹{payload.amount}. Agent pipeline running in background — refresh dashboard shortly for updated insights."}