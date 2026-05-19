from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from src.domain.entities.stock_movement import StockMovement


class IStockMovementRepository(ABC):
    @abstractmethod
    async def list_by_product(
        self,
        store_id: UUID,
        product_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[StockMovement], int]: ...

    @abstractmethod
    async def search(
        self,
        store_id: UUID,
        *,
        product_id: UUID | None = None,
        movement_type: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[StockMovement], int]: ...

    @abstractmethod
    async def list_for_export(
        self,
        store_id: UUID,
        *,
        from_date: datetime,
        to_date: datetime,
    ) -> list[StockMovement]: ...
