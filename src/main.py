import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from api.routes import router as api_router
from api.webhooks import router as webhook_router
from db.models import Base
from api.routes import engine
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Autonomous Local Budget Agent Backend",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            
    allow_credentials=True,           # Allows cookies and auth headers
    allow_methods=["*"],              # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],              # Allows all request headers
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(webhook_router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)