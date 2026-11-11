from uuid import UUID

from src.application.exceptions import NotFoundError, StockConflictError
from src.domain.entities.product import Product
from src.domain.entities.product_batch import NewBatch
from src.domain.repositories.product_repository import IProductRepository


class UpdateStockUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(
        self,
        store_id: UUID,
        product_id: UUID,
        quantity: int,
        reason: str | None = None,
        *,
        new_batch: NewBatch | None = None,
        batch_id: UUID | None = None,
    ) -> Product:
        """Ingreso (con lote nuevo si trae vencimiento) o salida (de un lote elegido o FEFO)."""
        if new_batch is not None and quantity <= 0:
            raise ValueError("La fecha de vencimiento solo se indica al agregar stock")
        if batch_id is not None and quantity >= 0:
            raise ValueError("El lote solo se elige al descontar stock")
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
            new_batch=new_batch,
            batch_id=batch_id,
        )
