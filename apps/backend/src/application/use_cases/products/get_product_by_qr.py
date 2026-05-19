from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class GetProductByQRUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, qr_code: str) -> Product:
        product = await self._repo.get_by_qr_code(store_id, qr_code)
        if not product:
            raise NotFoundError("Producto no encontrado")
        return product
