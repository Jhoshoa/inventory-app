from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from src.domain.entities.product_batch import NewBatch, ProductBatch


class IProductBatchRepository(ABC):
    @abstractmethod
    async def add(self, store_id: UUID, product_id: UUID, quantity: int, batch: NewBatch) -> ProductBatch:
        """Lote para unidades que ya estan en products.stock (p. ej. al crear el producto)."""

    @abstractmethod
    async def list_for_product(self, store_id: UUID, product_id: UUID, *, include_depleted: bool = False) -> list[ProductBatch]: ...

    @abstractmethod
    async def list_alerts(self, store_id: UUID, today: date, *, limit: int = 20) -> list[ProductBatch]: ...

    @abstractmethod
    async def count_alerts(self, store_id: UUID, today: date) -> tuple[int, int]:
        """(por vencer, vencidos) de lotes con unidades de productos no eliminados."""
