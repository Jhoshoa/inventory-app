from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.application.dto.sync_dto import (
    ProductSyncPayloadDTO,
    SaleSyncPayloadDTO,
    StockMovementSyncPayloadDTO,
    SyncChangeDTO,
    SyncChangeResultDTO,
    SyncEntity,
    SyncErrorDTO,
    SyncOperation,
    SyncPullChangeDTO,
    SyncResultStatus,
)
from src.domain.repositories.sync_repository import ISyncRepository
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.models.sale_model import SaleItemModel, SaleModel
from src.infrastructure.database.models.stock_movement_model import StockMovementModel
from src.infrastructure.database.models.sync_change_model import SyncChangeModel


class SyncRepository(ISyncRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_updates_since(self, store_id: UUID, since: datetime) -> list[SyncPullChangeDTO]:
        changes: list[SyncPullChangeDTO] = []

        product_result = await self._session.execute(
            select(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.updated_at > since,
            )
        )
        for product in product_result.scalars().all():
            changes.append(
                SyncPullChangeDTO(
                    entity=SyncEntity.PRODUCT,
                    operation=SyncOperation.DELETE if product.deleted_at else SyncOperation.UPSERT,
                    entity_id=product.id,
                    server_version=product.version,
                    server_updated_at=product.updated_at,
                    payload={
                        "id": str(product.id),
                        "name": product.name,
                        "price": str(product.price),
                        "stock": product.stock,
                        "category": product.category,
                        "min_stock": product.min_stock,
                        "unit": product.unit,
                        "sku": product.sku,
                        "cost_price": str(product.cost_price) if product.cost_price is not None else None,
                        "photo_url": product.photo_url,
                        "qr_code": product.qr_code,
                        "deleted_at": product.deleted_at,
                    },
                )
            )

        sale_result = await self._session.execute(
            select(SaleModel)
            .where(
                SaleModel.store_id == store_id,
                SaleModel.updated_at > since,
                SaleModel.deleted_at.is_(None),
            )
            .options(selectinload(SaleModel.items))
        )
        for sale in sale_result.scalars().all():
            changes.append(
                SyncPullChangeDTO(
                    entity=SyncEntity.SALE,
                    operation=SyncOperation.CREATE,
                    entity_id=sale.id,
                    server_version=sale.version,
                    server_updated_at=sale.updated_at,
                    payload={
                        "id": str(sale.id),
                        "device_id": sale.device_id,
                        "customer_name": sale.customer_name,
                        "total": str(sale.total),
                        "payment_method": sale.payment_method,
                        "status": sale.status,
                        "created_at": sale.created_at,
                        "items": [
                            {
                                "product_id": str(item.product_id),
                                "product_name": item.product_name,
                                "quantity": item.quantity,
                                "unit_price": str(item.unit_price),
                                "subtotal": str(item.subtotal),
                            }
                            for item in sale.items
                        ],
                    },
                )
            )

        movement_result = await self._session.execute(
            select(StockMovementModel).where(
                StockMovementModel.store_id == store_id,
                StockMovementModel.created_at > since,
            )
        )
        for movement in movement_result.scalars().all():
            changes.append(
                SyncPullChangeDTO(
                    entity=SyncEntity.STOCK_MOVEMENT,
                    operation=SyncOperation.CREATE,
                    entity_id=movement.id,
                    server_version=None,
                    server_updated_at=movement.created_at,
                    payload={
                        "id": str(movement.id),
                        "product_id": str(movement.product_id),
                        "sale_id": str(movement.sale_id) if movement.sale_id else None,
                        "movement_type": movement.movement_type,
                        "quantity_delta": movement.quantity_delta,
                        "stock_after": movement.stock_after,
                        "reason": movement.reason,
                        "device_id": movement.device_id,
                        "created_at": movement.created_at,
                    },
                )
            )

        return sorted(changes, key=lambda item: self._datetime_sort_key(item.server_updated_at))

    async def push_changes(
        self,
        store_id: UUID,
        device_id: str,
        changes: list[SyncChangeDTO],
    ) -> list[SyncChangeResultDTO]:
        results: list[SyncChangeResultDTO] = []
        for change in changes:
            duplicate = await self._get_processed_change(store_id, device_id, change.client_change_id)
            if duplicate is not None:
                results.append(self._duplicate_result(change, duplicate))
                continue

            result = await self._apply_change(store_id, device_id, change)
            await self._record_processed_change(store_id, device_id, change, result)
            results.append(result)

        await self._session.flush()
        return results

    async def _apply_change(self, store_id: UUID, device_id: str, change: SyncChangeDTO) -> SyncChangeResultDTO:
        try:
            if change.entity == SyncEntity.PRODUCT and change.operation == SyncOperation.UPSERT:
                version, updated_at = await self._apply_product_upsert(store_id, change)
                return self._result(change, SyncResultStatus.ACCEPTED, version, updated_at)
            if change.entity == SyncEntity.PRODUCT and change.operation == SyncOperation.DELETE:
                version, updated_at = await self._apply_product_delete(store_id, change)
                return self._result(change, SyncResultStatus.ACCEPTED, version, updated_at)
            if change.entity == SyncEntity.SALE and change.operation == SyncOperation.CREATE:
                version, updated_at = await self._apply_sale_create(store_id, device_id, change)
                return self._result(change, SyncResultStatus.ACCEPTED, version, updated_at)
            if change.entity == SyncEntity.STOCK_MOVEMENT and change.operation == SyncOperation.CREATE:
                updated_at = await self._apply_stock_movement_create(store_id, device_id, change)
                return self._result(change, SyncResultStatus.ACCEPTED, None, updated_at)
        except ValidationError as exc:
            return self._error_result(change, SyncResultStatus.REJECTED, "invalid_payload", str(exc))
        except ValueError as exc:
            return self._error_result(change, SyncResultStatus.CONFLICT, "conflict", str(exc))

        return self._error_result(
            change,
            SyncResultStatus.REJECTED,
            "unsupported_change",
            f"{change.entity}.{change.operation} is not supported",
        )

    async def _apply_product_upsert(self, store_id: UUID, change: SyncChangeDTO) -> tuple[int, datetime]:
        payload = ProductSyncPayloadDTO.model_validate(change.payload)
        model = await self._session.get(ProductModel, change.entity_id)
        if model is not None and model.store_id != store_id:
            raise ValueError("Producto pertenece a otra tienda")

        now = datetime.now(timezone.utc)
        if model is None:
            model = ProductModel(id=change.entity_id, store_id=store_id)
            self._session.add(model)

        model.name = payload.name
        model.price = payload.price
        model.stock = payload.stock
        model.category = payload.category
        model.min_stock = payload.min_stock
        model.unit = payload.unit
        model.sku = payload.sku
        model.cost_price = payload.cost_price
        model.photo_url = payload.photo_url
        model.qr_code = payload.qr_code
        model.is_active = True
        model.deleted_at = None
        model.version = (model.version or 0) + 1
        model.updated_at = now
        await self._session.flush()
        return model.version, model.updated_at

    async def _apply_product_delete(self, store_id: UUID, change: SyncChangeDTO) -> tuple[int | None, datetime]:
        model = await self._session.get(ProductModel, change.entity_id)
        if model is None:
            raise ValueError("Producto no encontrado")
        if model.store_id != store_id:
            raise ValueError("Producto pertenece a otra tienda")

        now = datetime.now(timezone.utc)
        model.deleted_at = now
        model.is_active = False
        model.version = (model.version or 0) + 1
        model.updated_at = now
        await self._session.flush()
        return model.version, model.updated_at

    async def _apply_sale_create(self, store_id: UUID, device_id: str, change: SyncChangeDTO) -> tuple[int, datetime]:
        payload = SaleSyncPayloadDTO.model_validate(change.payload)
        existing = await self._session.get(SaleModel, change.entity_id)
        if existing is not None:
            raise ValueError("Venta ya existe")

        sale = SaleModel(
            id=change.entity_id,
            store_id=store_id,
            device_id=device_id,
            customer_name=payload.customer_name,
            subtotal=Decimal("0"),
            discount=Decimal("0"),
            total=Decimal("0"),
            items_count=len(payload.items),
            payment_method=payload.payment_method,
            status="completed",
        )
        total = Decimal("0")
        stock_updates: list[tuple[ProductModel, int]] = []

        for item in payload.items:
            product = await self._session.get(ProductModel, item.product_id)
            if product is None or product.store_id != store_id or product.deleted_at is not None:
                raise ValueError(f"Producto no encontrado: {item.product_id}")
            if product.stock < item.quantity:
                raise ValueError(f"Stock insuficiente para {product.name}: {product.stock} < {item.quantity}")
            unit_price = item.unit_price if item.unit_price is not None else product.price
            subtotal = unit_price * item.quantity
            total += subtotal
            sale.items.append(
                SaleItemModel(
                    product_id=product.id,
                    product_name=product.name,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                )
            )
            stock_updates.append((product, item.quantity))

        sale.subtotal = total
        sale.total = total
        self._session.add(sale)
        await self._session.flush()

        now = datetime.now(timezone.utc)
        for product, quantity in stock_updates:
            product.stock -= quantity
            product.version = (product.version or 0) + 1
            product.updated_at = now
            self._session.add(
                StockMovementModel(
                    store_id=store_id,
                    product_id=product.id,
                    sale_id=sale.id,
                    movement_type="sale",
                    quantity_delta=-quantity,
                    stock_after=product.stock,
                    device_id=device_id,
                    reason="offline sale",
                )
            )

        await self._session.flush()
        return sale.version, sale.updated_at

    async def _apply_stock_movement_create(self, store_id: UUID, device_id: str, change: SyncChangeDTO) -> datetime:
        payload = StockMovementSyncPayloadDTO.model_validate(change.payload)
        if change.entity_id != payload.product_id:
            raise ValueError("entity_id debe coincidir con product_id")

        product = await self._session.get(ProductModel, payload.product_id)
        if product is None or product.store_id != store_id or product.deleted_at is not None:
            raise ValueError("Producto no encontrado")
        if product.stock + payload.quantity_delta < 0:
            raise ValueError(f"Stock insuficiente: {product.stock} < {abs(payload.quantity_delta)}")

        now = datetime.now(timezone.utc)
        product.stock += payload.quantity_delta
        product.version = (product.version or 0) + 1
        product.updated_at = now
        movement = StockMovementModel(
            store_id=store_id,
            product_id=product.id,
            movement_type=payload.movement_type,
            quantity_delta=payload.quantity_delta,
            stock_after=product.stock,
            reason=payload.reason,
            device_id=device_id,
        )
        self._session.add(movement)
        await self._session.flush()
        return movement.created_at

    async def _get_processed_change(
        self,
        store_id: UUID,
        device_id: str,
        client_change_id: str,
    ) -> SyncChangeModel | None:
        result = await self._session.execute(
            select(SyncChangeModel).where(
                SyncChangeModel.store_id == store_id,
                SyncChangeModel.device_id == device_id,
                SyncChangeModel.client_change_id == client_change_id,
            )
        )
        return result.scalar_one_or_none()

    async def _record_processed_change(
        self,
        store_id: UUID,
        device_id: str,
        change: SyncChangeDTO,
        result: SyncChangeResultDTO,
    ) -> None:
        self._session.add(
            SyncChangeModel(
                store_id=store_id,
                device_id=device_id,
                client_change_id=change.client_change_id,
                entity=change.entity.value,
                operation=change.operation.value,
                entity_id=change.entity_id,
                status=result.status.value,
                error_code=result.error.code if result.error else None,
                error_detail=result.error.detail if result.error else None,
                server_version=result.server_version,
                server_updated_at=result.server_updated_at,
                client_created_at=change.client_created_at,
            )
        )
        await self._session.flush()

    def _duplicate_result(self, change: SyncChangeDTO, existing: SyncChangeModel) -> SyncChangeResultDTO:
        return SyncChangeResultDTO(
            client_change_id=change.client_change_id,
            entity=SyncEntity(existing.entity),
            operation=SyncOperation(existing.operation),
            entity_id=existing.entity_id,
            status=SyncResultStatus.DUPLICATE,
            server_version=existing.server_version,
            server_updated_at=existing.server_updated_at,
            error=SyncErrorDTO(code=existing.error_code, detail=existing.error_detail)
            if existing.error_code and existing.error_detail
            else None,
        )

    def _result(
        self,
        change: SyncChangeDTO,
        status: SyncResultStatus,
        server_version: int | None,
        server_updated_at: datetime | None,
    ) -> SyncChangeResultDTO:
        return SyncChangeResultDTO(
            client_change_id=change.client_change_id,
            entity=change.entity,
            operation=change.operation,
            entity_id=change.entity_id,
            status=status,
            server_version=server_version,
            server_updated_at=server_updated_at,
        )

    def _error_result(
        self,
        change: SyncChangeDTO,
        status: SyncResultStatus,
        code: str,
        detail: str,
    ) -> SyncChangeResultDTO:
        return SyncChangeResultDTO(
            client_change_id=change.client_change_id,
            entity=change.entity,
            operation=change.operation,
            entity_id=change.entity_id,
            status=status,
            error=SyncErrorDTO(code=code, detail=detail),
        )

    def _datetime_sort_key(self, value: datetime) -> float:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.timestamp()
