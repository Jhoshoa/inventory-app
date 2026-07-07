from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.repositories.product_repository import IProductRepository


class DeleteProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, product_id: UUID) -> None:
        product = await self._repo.get_by_id(store_id, product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        await self._repo.delete(store_id, product_id)
