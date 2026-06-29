# src/core/llm.py
from langchain_ollama import ChatOllama, OllamaEmbeddings
from core.config import settings

def get_llm(fast: bool = False) -> ChatOllama:
    kwargs = {
        "base_url": settings.ollama_base_url,
        "model": settings.llm_model,
        "temperature": 0.0,
    }
    if fast:
        # Smaller context window + capped output = much faster on CPU
        kwargs["num_ctx"] = 2048
        kwargs["num_predict"] = 1024
    return ChatOllama(**kwargs)

def get_embeddings() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        base_url=settings.ollama_base_url,
        model=settings.embedding_model
    )