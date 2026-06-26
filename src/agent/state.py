from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentFinancialState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_id: str
    metrics: dict
    retrieved_context: list[str]
    errors: list[str]