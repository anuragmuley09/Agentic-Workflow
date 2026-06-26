from langchain_core.tools import tool
from sqlalchemy import select
from db.models import BudgetGoal
from agent.tools.financial_tools import ToolSessionLocal

@tool
async def create_budget_goal(user_id: str, name: str, target_amount: float) -> str:
    """Creates a new budget goal for the user and saves it to the database."""
    async with ToolSessionLocal() as session:
        new_goal = BudgetGoal(
            user_id=user_id,
            name=name,
            target_amount=target_amount,
            current_amount=0.0
        )
        session.add(new_goal)
        await session.commit()
        return f"Goal '{name}' with target {target_amount} established successfully."

@tool
async def evaluate_goal_variance(user_id: str, transaction_amount: float, transaction_category: str) -> dict:
    """Calculates the impact of a specific transaction on the user's active budget goals."""
    async with ToolSessionLocal() as session:
        stmt = select(BudgetGoal).where(BudgetGoal.user_id == user_id)
        result = await session.execute(stmt)
        goals = result.scalars().all()
        
        variances = []
        for goal in goals:
            is_category_match = transaction_category.lower() in goal.name.lower() or transaction_category.lower() == "all"
            impact = transaction_amount if is_category_match else 0.0
            
            new_current = goal.current_amount + impact
            pacing_gap = goal.target_amount - new_current
            
            variances.append({
                "goal_name": goal.name,
                "target_amount": goal.target_amount,
                "current_amount": goal.current_amount,
                "projected_amount": new_current,
                "variance": pacing_gap,
                "is_compromised": new_current > goal.target_amount
            })
            
        return {"impacted_goals": variances}