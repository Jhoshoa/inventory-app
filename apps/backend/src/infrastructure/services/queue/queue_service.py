from src.application.ports.queue_service import IQueueService
from src.infrastructure.services.queue.celery_app import celery_app


class CeleryQueueService(IQueueService):
    async def enqueue(self, task_name: str, args: tuple = (), kwargs: dict | None = None) -> None:
        celery_app.send_task(task_name, args=args, kwargs=kwargs or {})
