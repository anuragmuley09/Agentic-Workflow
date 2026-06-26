from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentFinancialState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_id: str
    metrics: dict
    retrieved_context: list[str]
    errors: list[str]
    statement_id: str
    extracted_transactions: list[dict]
    analyzed_transactions: list[dict]
    goal_status: list[dict]
    alerts: list[dict]
    financial_plan: dict