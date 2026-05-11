from abc import ABC, abstractmethod
from uuid import UUID
from src.domain.entities.store import Store


class IStoreRepository(ABC):
    @abstractmethod
    async def save(self, store: Store) -> Store: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID) -> Store | None: ...
