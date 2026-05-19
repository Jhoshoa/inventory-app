from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from src.domain.entities.stock_movement import StockMovement
from src.domain.repositories.stock_movement_repository import IStockMovementRepository


@dataclass
class ListStockMovementsInput:
    store_id: UUID
    product_id: UUID | None = None
    movement_type: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
    limit: int = 50
    offset: int = 0


class ListStockMovementsUseCase:
    def __init__(self, repo: IStockMovementRepository):
        self._repo = repo

    async def execute(self, input: ListStockMovementsInput) -> tuple[list[StockMovement], int]:
        if input.from_date and input.to_date:
            if input.from_date > input.to_date:
                raise ValueError("La fecha inicial no puede ser mayor a la fecha final")
            if input.to_date - input.from_date > timedelta(days=90):
                raise ValueError("El rango maximo es 90 dias")
        return await self._repo.search(
            input.store_id,
            product_id=input.product_id,
            movement_type=input.movement_type,
            from_date=input.from_date,
            to_date=input.to_date,
            limit=input.limit,
            offset=input.offset,
        )
