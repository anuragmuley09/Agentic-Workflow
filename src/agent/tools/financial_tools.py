# src/agent/tools/financial_tools.py
from langchain_core.tools import tool
from sqlalchemy import select
from db.models import Transaction, BudgetGoal
from core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Separate session worker instance specifically for tool execution paths
tool_engine = create_async_engine(settings.database_url, echo=False)
ToolSessionLocal = async_sessionmaker(bind=tool_engine, class_=AsyncSession, expire_on_commit=False)

@tool
def calculate_financial_metrics(ledger_transactions: list[dict]) -> dict:
    """Calculates income, total expenses, net cashflow, and category breakdowns from a raw transaction ledger."""
    income_total = 0.0
    expense_total = 0.0
    categories = {}

    for tx in ledger_transactions:
        amt = float(tx.get("amount", 0.0))
        direction = tx.get("direction", "debit").lower()
        cat = tx.get("category", "Other")

        if direction == "credit":
            income_total += amt
        else:
            expense_total += amt
            categories[cat] = categories.get(cat, 0.0) + amt

    return {
        "income_total": income_total,
        "expense_total": expense_total,
        "net_cashflow": income_total - expense_total,
        "category_breakdown": categories,
        "savings_rate": round((income_total - expense_total) / income_total, 4) if income_total > 0 else 0.0
    }

@tool
async def fetch_user_profile_data(user_id: str) -> dict:
    """Queries the database for a user's logged financial transactions and current budget goals."""
    async with ToolSessionLocal() as session:
        tx_stmt = select(Transaction).where(Transaction.user_id == user_id)
        goal_stmt = select(BudgetGoal).where(BudgetGoal.user_id == user_id)
        
        tx_result = await session.execute(tx_stmt)
        goal_result = await session.execute(goal_stmt)
        
        transactions = tx_result.scalars().all()
        goals = goal_result.scalars().all()
        
        return {
            "transactions": [
                {
                    "date": str(t.transaction_date), 
                    "desc": t.description, 
                    "amount": t.amount, 
                    "direction": t.direction, 
                    "category": t.category
                } for t in transactions
            ],
            "goals": [
                {
                    "name": g.name, 
                    "target": g.target_amount, 
                    "current": g.current_amount, 
                    "deadline": str(g.target_date)
                } for g in goals
            ]
        }