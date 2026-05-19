from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.stock_movement import StockMovement
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.stock_movement_repository import IStockMovementRepository


@dataclass
class ListProductStockMovementsInput:
    store_id: UUID
    product_id: UUID
    limit: int = 50
    offset: int = 0


class ListProductStockMovementsUseCase:
    def __init__(self, movement_repo: IStockMovementRepository, product_repo: IProductRepository):
        self._movement_repo = movement_repo
        self._product_repo = product_repo

    async def execute(self, input: ListProductStockMovementsInput) -> tuple[list[StockMovement], int]:
        product = await self._product_repo.get_by_id(input.store_id, input.product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        return await self._movement_repo.list_by_product(
            input.store_id,
            input.product_id,
            limit=input.limit,
            offset=input.offset,
        )
