from langgraph.graph import StateGraph, END
from agent.state import AgentFinancialState
from agent.nodes import memory_injection_node, reasoner_node
from langgraph.prebuilt import ToolNode
from agent.tools.financial_tools import calculate_financial_metrics, fetch_user_profile_data
from agent.tools.goal_tools import evaluate_goal_variance, create_budget_goal

def route_after_reasoner(state: AgentFinancialState):
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

workflow = StateGraph(AgentFinancialState)

workflow.add_node("memory_injection", memory_injection_node)
workflow.add_node("reasoner", reasoner_node)
workflow.add_node("tools", ToolNode([
    calculate_financial_metrics, 
    fetch_user_profile_data, 
    evaluate_goal_variance,
    create_budget_goal
]))

workflow.set_entry_point("memory_injection")
workflow.add_edge("memory_injection", "reasoner")
workflow.add_conditional_edges("reasoner", route_after_reasoner, {"tools": "tools", END: END})
workflow.add_edge("tools", "reasoner")

agent_graph = workflow.compile()