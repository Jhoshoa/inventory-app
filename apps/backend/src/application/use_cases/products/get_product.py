from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class GetProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, product_id: UUID) -> Product:
        product = await self._repo.get_by_id(store_id, product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        return product
