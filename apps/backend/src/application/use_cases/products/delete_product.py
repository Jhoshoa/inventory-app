from uuid import UUID
from src.domain.repositories.product_repository import IProductRepository


class DeleteProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, product_id: UUID) -> None:
        await self._repo.delete(product_id)
