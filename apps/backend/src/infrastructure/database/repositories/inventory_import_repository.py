from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.entities.inventory_import import InventoryImport, InventoryImportItem
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository
from src.infrastructure.database.models.inventory_import_model import (
    InventoryImportItemModel,
    InventoryImportModel,
)


class InventoryImportRepository(IInventoryImportRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, inventory_import: InventoryImport) -> InventoryImport:
        model = InventoryImportModel(
            id=inventory_import.id,
            store_id=inventory_import.store_id,
            status=inventory_import.status,
            source_filename=inventory_import.source_filename,
            source_content_type=inventory_import.source_content_type,
            source_photo_url=inventory_import.source_photo_url,
            raw_text=inventory_import.raw_text,
            error_message=inventory_import.error_message,
            items_count=len(inventory_import.items),
            created_by=inventory_import.created_by,
        )
        model.items = [self._item_to_model(item) for item in inventory_import.items]
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def list_by_store(
        self,
        store_id: UUID,
        *,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[InventoryImport], int]:
        filters = [InventoryImportModel.store_id == store_id]
        if status:
            filters.append(InventoryImportModel.status == status)

        total_result = await self._session.execute(
            select(func.count()).select_from(InventoryImportModel).where(*filters)
        )
        total = int(total_result.scalar_one())
        result = await self._session.execute(
            select(InventoryImportModel)
            .where(*filters)
            .options(selectinload(InventoryImportModel.items))
            .order_by(InventoryImportModel.created_at.desc(), InventoryImportModel.id.asc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(model) for model in result.scalars().all()], total

    async def get_by_id(self, store_id: UUID, import_id: UUID) -> InventoryImport | None:
        result = await self._session.execute(
            select(InventoryImportModel)
            .where(InventoryImportModel.store_id == store_id, InventoryImportModel.id == import_id)
            .options(selectinload(InventoryImportModel.items))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update_item(self, item: InventoryImportItem) -> InventoryImportItem:
        result = await self._session.execute(
            select(InventoryImportItemModel).where(
                InventoryImportItemModel.store_id == item.store_id,
                InventoryImportItemModel.import_id == item.import_id,
                InventoryImportItemModel.id == item.id,
            )
        )
        model = result.scalar_one()
        model.status = item.status
        model.name = item.name
        model.category = item.category
        model.sku = item.sku
        model.unit = item.unit
        model.price = item.price
        model.cost_price = item.cost_price
        model.stock = item.stock
        model.min_stock = item.min_stock
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._item_to_entity(model)

    async def mark_confirmed(self, inventory_import: InventoryImport) -> InventoryImport:
        result = await self._session.execute(
            select(InventoryImportModel)
            .where(
                InventoryImportModel.store_id == inventory_import.store_id,
                InventoryImportModel.id == inventory_import.id,
            )
            .options(selectinload(InventoryImportModel.items))
        )
        model = result.scalar_one()
        model.status = inventory_import.status
        model.confirmed_at = inventory_import.confirmed_at
        model.updated_at = datetime.now(timezone.utc)
        items_by_id = {item.id: item for item in inventory_import.items}
        for item_model in model.items:
            item = items_by_id.get(item_model.id)
            if item is None:
                continue
            item_model.status = item.status
            item_model.product_id = item.product_id
            item_model.error_message = item.error_message
            item_model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    async def cancel(self, inventory_import: InventoryImport) -> InventoryImport:
        result = await self._session.execute(
            select(InventoryImportModel).where(
                InventoryImportModel.store_id == inventory_import.store_id,
                InventoryImportModel.id == inventory_import.id,
            )
        )
        model = result.scalar_one()
        model.status = inventory_import.status
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    def _to_entity(self, model: InventoryImportModel) -> InventoryImport:
        items = sorted((self._item_to_entity(item) for item in model.items), key=lambda item: item.row_number)
        return InventoryImport(
            id=model.id,
            store_id=model.store_id,
            status=model.status,
            source_filename=model.source_filename,
            source_content_type=model.source_content_type,
            source_photo_url=model.source_photo_url,
            raw_text=model.raw_text,
            error_message=model.error_message,
            items_count=model.items_count,
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
            confirmed_at=model.confirmed_at,
            items=items,
        )

    def _item_to_entity(self, model: InventoryImportItemModel) -> InventoryImportItem:
        return InventoryImportItem(
            id=model.id,
            import_id=model.import_id,
            store_id=model.store_id,
            status=model.status,
            row_number=model.row_number,
            name=model.name,
            category=model.category,
            sku=model.sku,
            unit=model.unit,
            price=model.price,
            cost_price=model.cost_price,
            stock=model.stock,
            min_stock=model.min_stock,
            confidence=model.confidence,
            raw_data=model.raw_data or {},
            product_id=model.product_id,
            error_message=model.error_message,
        )

    def _item_to_model(self, item: InventoryImportItem) -> InventoryImportItemModel:
        return InventoryImportItemModel(
            id=item.id,
            import_id=item.import_id,
            store_id=item.store_id,
            status=item.status,
            row_number=item.row_number,
            name=item.name,
            category=item.category,
            sku=item.sku,
            unit=item.unit,
            price=item.price,
            cost_price=item.cost_price,
            stock=item.stock,
            min_stock=item.min_stock,
            confidence=item.confidence,
            raw_data=item.raw_data,
            product_id=item.product_id,
            error_message=item.error_message,
        )
