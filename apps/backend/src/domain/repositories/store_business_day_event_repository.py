from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.store_business_day_event import StoreBusinessDayEvent


class IStoreBusinessDayEventRepository(ABC):
    @abstractmethod
    async def save(self, event: StoreBusinessDayEvent) -> StoreBusinessDayEvent: ...

    @abstractmethod
    async def list_by_business_day(self, store_id: UUID, business_day_id: UUID) -> list[StoreBusinessDayEvent]: ...
