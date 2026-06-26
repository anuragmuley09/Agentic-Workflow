from celery import Celery
from core.config import settings

# Initialize Celery app with Redis broker and backend
celery_app = Celery(
    "budget_buddy_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

# Configure task execution serializations and timezones
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=["tasks.recalculations"]  # Automatically import tasks module
)
