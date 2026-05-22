from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID

from src.domain.entities.cash_movement import CashMovement


class ICashMovementRepository(ABC):
    @abstractmethod
    async def save(self, movement: CashMovement) -> CashMovement: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, movement_id: UUID) -> CashMovement | None: ...

    @abstractmethod
    async def search(
        self,
        store_id: UUID,
        *,
        business_day_id: UUID | None = None,
        movement_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        include_voided: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CashMovement], int]: ...

    @abstractmethod
    async def summary_for_business_day(self, store_id: UUID, business_day_id: UUID) -> dict: ...

    @abstractmethod
    async def update(self, movement: CashMovement) -> CashMovement: ...

    @abstractmethod
    async def list_for_export(
        self,
        store_id: UUID,
        *,
        from_date: datetime,
        to_date: datetime,
        movement_type: str | None = None,
    ) -> list[CashMovement]: ...
