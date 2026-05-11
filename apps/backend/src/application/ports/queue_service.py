from abc import ABC, abstractmethod


class IQueueService(ABC):
    @abstractmethod
    async def enqueue(self, task_name: str, args: tuple = (), kwargs: dict | None = None) -> None: ...
