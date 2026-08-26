from uuid import UUID

from src.application.exceptions import NotFoundError, StockConflictError
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class UpdateStockUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, product_id: UUID, quantity: int, reason: str | None = None) -> Product:
        product = await self._repo.get_by_id(store_id, product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        if quantity < 0 and abs(quantity) > product.stock:
            raise StockConflictError(
                product_id=str(product.id),
                product_name=product.name,
                available_stock=product.stock,
                requested_quantity=abs(quantity),
            )
        return await self._repo.update_stock(
            store_id,
            product_id,
            quantity,
            movement_type="manual_adjustment",
            reason=reason,
        )
