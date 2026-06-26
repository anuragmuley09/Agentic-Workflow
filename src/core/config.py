from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5433/budget_agent"
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "llama3.1:8b"
    embedding_model: str = "nomic-embed-text"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()