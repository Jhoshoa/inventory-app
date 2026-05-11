from abc import ABC, abstractmethod
from uuid import UUID
from datetime import datetime


class ISyncRepository(ABC):
    @abstractmethod
    async def get_updates_since(self, store_id: UUID, since: datetime) -> list[dict]: ...

    @abstractmethod
    async def push_changes(self, store_id: UUID, changes: list[dict]) -> None: ...
