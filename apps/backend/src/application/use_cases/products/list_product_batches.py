from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.product_batch import ProductBatch
from src.domain.repositories.product_batch_repository import IProductBatchRepository
from src.domain.repositories.product_repository import IProductRepository


class ListProductBatchesUseCase:
    def __init__(self, batch_repo: IProductBatchRepository, product_repo: IProductRepository):
        self._batch_repo = batch_repo
        self._product_repo = product_repo

    async def execute(self, store_id: UUID, product_id: UUID) -> tuple[list[ProductBatch], int]:
        """Lotes con unidades y cuantas unidades del producto no tienen lote."""
        product = await self._product_repo.get_by_id(store_id, product_id)
        if product is None:
            raise NotFoundError("Producto no encontrado")
        batches = await self._batch_repo.list_for_product(store_id, product_id)
        untracked = max(0, product.stock - sum(batch.quantity_remaining for batch in batches))
        return batches, untracked
