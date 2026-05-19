from abc import ABC, abstractmethod
from uuid import UUID
from datetime import datetime
from typing import Any


class ISyncRepository(ABC):
    @abstractmethod
    async def get_updates_since(self, store_id: UUID, since: datetime) -> list[Any]: ...

    @abstractmethod
    async def push_changes(
        self,
        store_id: UUID,
        device_id: str,
        changes: list[Any],
    ) -> list[Any]: ...
