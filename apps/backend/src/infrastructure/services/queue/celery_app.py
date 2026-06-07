from celery import Celery
from src.config.settings import settings

celery_app = Celery(
    "inventory",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.infrastructure.services.queue.tasks.sync_tasks",
        "src.infrastructure.services.queue.tasks.notification_tasks",
    ],
)

celery_app.conf.task_routes = {
    "sync_tasks.*": {"queue": "sync-offline"},
    "notification_tasks.*": {"queue": "notifications"},
}

celery_app.conf.beat_schedule = {
    "sync-every-5-minutes": {
        "task": "sync_tasks.process_sync_queue",
        "schedule": 300.0,
    },
}
