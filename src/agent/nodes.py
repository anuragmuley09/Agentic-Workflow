from core.llm import get_llm
from agent.state import AgentFinancialState
from agent.tools.financial_tools import calculate_financial_metrics, fetch_user_profile_data
from agent.tools.goal_tools import evaluate_goal_variance, create_budget_goal
from langchain_core.messages import SystemMessage

llm = get_llm()
tools_map = {
    "calculate_financial_metrics": calculate_financial_metrics,
    "fetch_user_profile_data": fetch_user_profile_data,
    "evaluate_goal_variance": evaluate_goal_variance,
    "create_budget_goal": create_budget_goal
}
llm_with_tools = llm.bind_tools(list(tools_map.values()))

async def memory_injection_node(state: AgentFinancialState):
    return {"retrieved_context": state.get("retrieved_context", [])}

async def reasoner_node(state: AgentFinancialState):
    messages = state["messages"]
    user_id = state.get("user_id", "unknown_user")
    
    if not any(isinstance(m, SystemMessage) for m in messages):
        sys_prompt = SystemMessage(content=(
            f"You are an autonomous financial agent. The active user's ID is '{user_id}'. "
            "You MUST use this exact ID string when calling tools that require a user_id parameter. "
            "Execute 'create_budget_goal' when instructed to create a goal. "
            "If you receive a SYSTEM_EVENT regarding a transaction, you MUST execute 'evaluate_goal_variance'. "
            "Once you receive the tool output, generate a direct, text-based nudge. Never output raw JSON strings."
        ))
        messages = [sys_prompt] + list(messages)
        
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}