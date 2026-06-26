from langgraph.graph import StateGraph, END
from agent.state import AgentFinancialState
from agent.nodes import (
    memory_injection_node,
    extractor_agent_node,
    analyzer_agent_node,
    goal_tracker_agent_node,
    expense_alert_agent_node,
    financial_planner_agent_node
)

workflow = StateGraph(AgentFinancialState)

# Register agent nodes
workflow.add_node("memory_injection", memory_injection_node)
workflow.add_node("extractor", extractor_agent_node)
workflow.add_node("analyzer", analyzer_agent_node)
workflow.add_node("goal_tracker", goal_tracker_agent_node)
workflow.add_node("expense_alert", expense_alert_agent_node)
workflow.add_node("planner", financial_planner_agent_node)

# Connect execution steps (with parallel execution for tracking & alerts)
workflow.set_entry_point("memory_injection")
workflow.add_edge("memory_injection", "extractor")
workflow.add_edge("extractor", "analyzer")

# Parallel fork
workflow.add_edge("analyzer", "goal_tracker")
workflow.add_edge("analyzer", "expense_alert")

# Join results at the Planner
workflow.add_edge("goal_tracker", "planner")
workflow.add_edge("expense_alert", "planner")

workflow.add_edge("planner", END)

agent_graph = workflow.compile()