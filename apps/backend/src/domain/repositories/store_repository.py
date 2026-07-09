from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID

from src.domain.entities.store import Store


class IStoreRepository(ABC):
    @abstractmethod
    async def save(self, store: Store) -> Store: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID) -> Store | None: ...

    @abstractmethod
    async def set_first_business_date(self, store_id: UUID, first_business_date: date) -> None: ...

    @abstractmethod
    async def list_by_expired_trial(self, cutoff: datetime) -> list[Store]: ...
