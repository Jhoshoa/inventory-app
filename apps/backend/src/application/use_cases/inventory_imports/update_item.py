from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.domain.entities.inventory_import import (
    InventoryImportItem,
    InventoryImportItemStatus,
    InventoryImportStatus,
)
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository


@dataclass
class UpdateInventoryImportItemInput:
    store_id: UUID
    import_id: UUID
    item_id: UUID
    status: str | None = None
    name: str | None = None
    category: str | None = None
    sku: str | None = None
    unit: str | None = None
    price: Decimal | None = None
    cost_price: Decimal | None = None
    stock: int | None = None
    min_stock: int | None = None


class UpdateInventoryImportItemUseCase:
    def __init__(self, repo: IInventoryImportRepository):
        self._repo = repo

    async def execute(self, input: UpdateInventoryImportItemInput) -> InventoryImportItem:
        inventory_import = await self._repo.get_by_id(input.store_id, input.import_id)
        if not inventory_import:
            raise NotFoundError("Importacion no encontrada")
        if inventory_import.status != InventoryImportStatus.NEEDS_REVIEW.value:
            raise ConflictError("Solo se pueden editar importaciones en revision")
        item = next((candidate for candidate in inventory_import.items if candidate.id == input.item_id), None)
        if item is None:
            raise NotFoundError("Item de importacion no encontrado")
        if item.status == InventoryImportItemStatus.IMPORTED.value:
            raise ConflictError("El item ya fue importado")

        for field_name in ("status", "name", "category", "sku", "unit", "price", "cost_price", "stock", "min_stock"):
            value = getattr(input, field_name)
            if value is not None:
                setattr(item, field_name, value)
        item.validate_for_review()
        return await self._repo.update_item(item)
