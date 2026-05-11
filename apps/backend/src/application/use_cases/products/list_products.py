from uuid import UUID
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class ListProductsUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID) -> list[Product]:
        return await self._repo.list_by_store(store_id)
