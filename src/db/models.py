from datetime import date, datetime, timezone
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Transaction(Base):
    __tablename__ = "transactions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    transaction_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Float)
    direction: Mapped[str] = mapped_column(String(16))
    category: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BudgetGoal(Base):
    __tablename__ = "budget_goals"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    target_amount: Mapped[float] = mapped_column(Float)
    current_amount: Mapped[float] = mapped_column(Float, default=0.0)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class AgentMemory(Base):
    __tablename__ = "agent_memory"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    memory_type: Mapped[str] = mapped_column(String(64))
    content: Mapped[str] = mapped_column(String)
    embedding: Mapped[list[float]] = mapped_column(Vector(768))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Statement(Base):
    __tablename__ = "statements"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(50))  # e.g. CSV, PDF
    period: Mapped[str] = mapped_column(String(50))      # e.g. January 2026
    generated_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CreditDetails(Base):
    __tablename__ = "credit_details"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    outstanding_loan: Mapped[float] = mapped_column(Float, default=0.0)
    credit_card_due: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SpendDetails(Base):
    __tablename__ = "spend_details"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    groceries: Mapped[float] = mapped_column(Float, default=0.0)
    utilities: Mapped[float] = mapped_column(Float, default=0.0)
    entertainment: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExpenseAlert(Base):
    __tablename__ = "expense_alerts"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(100))
    threshold: Mapped[float] = mapped_column(Float)
    trigger_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FinancialPlan(Base):
    __tablename__ = "financial_plans"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    create_date: Mapped[date] = mapped_column(Date)
    recommendations: Mapped[str] = mapped_column(String)  # recommendations text
    risk_profile: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExcelInput(Base):
    __tablename__ = "excel_inputs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    uploaded_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExcelRecord(Base):
    __tablename__ = "excel_records"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    excel_id: Mapped[str] = mapped_column(ForeignKey("excel_inputs.id"), index=True)
    month: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AnalyzerStatement(Base):
    __tablename__ = "analyzer_statements"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    statement_id: Mapped[str] = mapped_column(ForeignKey("statements.id"), index=True)
    total_spending: Mapped[float] = mapped_column(Float, default=0.0)
    credit_usage: Mapped[float] = mapped_column(Float, default=0.0)
    insights: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CategorySpending(Base):
    __tablename__ = "category_spending"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    record_id: Mapped[str] = mapped_column(ForeignKey("excel_records.id"), index=True)
    category: Mapped[str] = mapped_column(String(100))
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)