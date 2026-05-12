from uuid import UUID
from src.domain.repositories.product_repository import IProductRepository
from src.application.exceptions import NotFoundError


class DeleteProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, product_id: UUID) -> None:
        product = await self._repo.get_by_id(product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        await self._repo.delete(product_id)
