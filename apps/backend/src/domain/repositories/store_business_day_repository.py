from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from src.domain.entities.store_business_day import StoreBusinessDay


class IStoreBusinessDayRepository(ABC):
    @abstractmethod
    async def save(self, business_day: StoreBusinessDay) -> StoreBusinessDay: ...

    @abstractmethod
    async def get_open_by_store(self, store_id: UUID) -> StoreBusinessDay | None: ...

    @abstractmethod
    async def get_by_business_date(self, store_id: UUID, business_date: date) -> StoreBusinessDay | None: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, business_day_id: UUID) -> StoreBusinessDay | None: ...

    @abstractmethod
    async def list_by_date_range(
        self,
        store_id: UUID,
        from_date: date,
        to_date: date,
        limit: int,
        offset: int,
    ) -> tuple[list[StoreBusinessDay], int]: ...

    @abstractmethod
    async def close(self, business_day: StoreBusinessDay) -> StoreBusinessDay: ...

    @abstractmethod
    async def reopen(self, business_day: StoreBusinessDay) -> StoreBusinessDay: ...
