# src/core/llm.py
from langchain_ollama import ChatOllama, OllamaEmbeddings
from core.config import settings

def get_llm() -> ChatOllama:
    return ChatOllama(
        base_url=settings.ollama_base_url,
        model=settings.llm_model,
        temperature=0.0
    )

def get_embeddings() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        base_url=settings.ollama_base_url,
        model=settings.embedding_model
    )