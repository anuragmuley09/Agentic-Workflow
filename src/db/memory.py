# src/db/memory.py
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.llm import get_embeddings
from db.models import AgentMemory

class VectorMemoryService:
    def __init__(self):
        self.embeddings = get_embeddings()

    async def store_memory(self, session: AsyncSession, user_id: str, memory_type: str, content: str, metadata: dict = None):
        # Generate embedding vector locally using Ollama
        embedding_vector = await self.embeddings.aembed_query(content)
        
        memory_entry = AgentMemory(
            user_id=user_id,
            memory_type=memory_type,
            content=content,
            embedding=embedding_vector,
            metadata_json=metadata or {}
        )
        session.add(memory_entry)
        await session.commit()

    async def query_similar_memory(self, session: AsyncSession, user_id: str, query_text: str, limit: int = 3) -> list[dict]:
        query_vector = await self.embeddings.aembed_query(query_text)
        
        # Native pgvector cosine distance query using SQLAlchemy text anchors
        sql = text("""
            SELECT id, memory_type, content, metadata_json, 
                   (embedding <=> :vector) as distance
            FROM agent_memory
            WHERE user_id = :user_id
            ORDER BY embedding <=> :vector
            LIMIT :limit
        """)
        
        result = await session.execute(sql, {"vector": str(query_vector), "user_id": user_id, "limit": limit})
        rows = result.fetchall()
        
        return [
            {
                "id": row[0],
                "memory_type": row[1],
                "content": row[2],
                "metadata": row[3],
                "score": 1 - row[4]  # Convert distance to similarity score
            }
            for row in rows
        ]