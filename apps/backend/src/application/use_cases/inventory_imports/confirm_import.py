from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.products.create_product import CreateProductInput, CreateProductUseCase
from src.domain.entities.inventory_import import (
    InventoryImport,
    InventoryImportItemStatus,
    InventoryImportStatus,
)
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository
from src.domain.repositories.product_repository import IProductRepository


@dataclass
class ConfirmInventoryImportResult:
    inventory_import: InventoryImport
    created_products: int
    failed_items: int = 0


class ConfirmInventoryImportUseCase:
    def __init__(self, import_repo: IInventoryImportRepository, product_repo: IProductRepository):
        self._import_repo = import_repo
        self._product_repo = product_repo

    async def execute(self, store_id: UUID, import_id: UUID) -> ConfirmInventoryImportResult:
        inventory_import = await self._import_repo.get_by_id(store_id, import_id)
        if not inventory_import:
            raise NotFoundError("Importacion no encontrada")
        if inventory_import.status == InventoryImportStatus.CONFIRMED.value:
            raise ConflictError("La importacion ya fue confirmada")
        if inventory_import.status != InventoryImportStatus.NEEDS_REVIEW.value:
            raise ConflictError("Solo se pueden confirmar importaciones en revision")

        approved_items = [
            item for item in inventory_import.items if item.status == InventoryImportItemStatus.APPROVED.value
        ]
        if not approved_items:
            raise ValueError("No hay items aprobados para importar")

        create_product = CreateProductUseCase(self._product_repo)
        for item in approved_items:
            item.validate_for_review()
            product = await create_product.execute(
                CreateProductInput(
                    store_id=store_id,
                    name=item.name,
                    price=item.price,
                    stock=0,
                    category=item.category,
                    min_stock=item.min_stock,
                    unit=item.unit,
                    sku=item.sku,
                    cost_price=item.cost_price,
                )
            )
            if item.stock > 0:
                product = await self._product_repo.update_stock(
                    store_id,
                    product.id,
                    item.stock,
                    movement_type="import",
                    reason=f"inventory_import:{inventory_import.id}",
                )
            item.status = InventoryImportItemStatus.IMPORTED.value
            item.product_id = product.id

        inventory_import.status = InventoryImportStatus.CONFIRMED.value
        inventory_import.confirmed_at = datetime.now(timezone.utc)
        confirmed = await self._import_repo.mark_confirmed(inventory_import)
        return ConfirmInventoryImportResult(inventory_import=confirmed, created_products=len(approved_items))
