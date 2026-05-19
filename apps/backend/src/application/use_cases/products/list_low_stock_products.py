from uuid import UUID

from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class ListLowStockProductsUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, limit: int = 20) -> list[Product]:
        return await self._repo.list_low_stock(store_id, limit)
