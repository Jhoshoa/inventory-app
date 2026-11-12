from uuid import UUID

from src.application.exceptions import NotFoundError
from src.application.use_cases.products.code_rules import normalize_product_code
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class GetProductByQRUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, qr_code: str) -> Product:
        # Los codigos se guardan en mayusculas: "abc-1" escrito a mano encuentra "ABC-1".
        code = normalize_product_code(qr_code)
        product = await self._repo.get_by_qr_code(store_id, code) if code else None
        if not product and code != qr_code:
            product = await self._repo.get_by_qr_code(store_id, qr_code)
        if not product:
            raise NotFoundError("Producto no encontrado")
        return product
