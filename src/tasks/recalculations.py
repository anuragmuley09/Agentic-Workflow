import asyncio
from core.celery_app import celery_app
from sqlalchemy import select
from db.models import Transaction, BudgetGoal, User
from agent.tools.financial_tools import ToolSessionLocal

@celery_app.task(name="tasks.recalculations.recalculate_all_users_goals")
def recalculate_all_users_goals():
    """Synchronous entry point for Celery to run our async database recalculation logic."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    return loop.run_until_complete(async_recalculate_goals())

async def async_recalculate_goals():
    async with ToolSessionLocal() as session:
        # Fetch all registered users in PostgreSQL
        stmt = select(User)
        result = await session.execute(stmt)
        users = result.scalars().all()
        
        updated_goals_count = 0
        
        for user in users:
            # Query transactions and active goals for this specific user
            tx_stmt = select(Transaction).where(Transaction.user_id == user.id)
            goal_stmt = select(BudgetGoal).where(BudgetGoal.user_id == user.id)
            
            tx_result = await session.execute(tx_stmt)
            goal_result = await session.execute(goal_stmt)
            
            txs = tx_result.scalars().all()
            goals = goal_result.scalars().all()
            
            for goal in goals:
                matching_amt = 0.0
                for tx in txs:
                    if tx.direction == "debit":
                        # Check name matching rules (e.g. Dining, Utilities)
                        is_match = False
                        if goal.name.lower() in tx.category.lower() or tx.category.lower() in goal.name.lower():
                            is_match = True
                        elif "all" in goal.name.lower() or "total" in goal.name.lower():
                            is_match = True
                        elif goal.name.lower() in tx.description.lower():
                            is_match = True
                            
                        if is_match:
                            matching_amt += tx.amount
                            
                # Calculate net cash savings
                total_income = sum(t.amount for t in txs if t.direction == "credit")
                total_expense = sum(t.amount for t in txs if t.direction == "debit")
                net_savings = max(0.0, total_income - total_expense)
                
                # Assign values based on goal type (savings vs expenses)
                if "save" in goal.name.lower() or "saving" in goal.name.lower():
                    current_amount = net_savings
                else:
                    current_amount = matching_amt
                    
                goal.current_amount = current_amount
                session.add(goal)
                updated_goals_count += 1
                
        await session.commit()
        return f"Successfully recalculated {updated_goals_count} budget goals across all users."
