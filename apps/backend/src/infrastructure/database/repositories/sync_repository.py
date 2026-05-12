from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.repositories.sync_repository import ISyncRepository
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.models.sale_model import SaleModel


class SyncRepository(ISyncRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_updates_since(self, store_id: UUID, since: datetime) -> list[dict]:
        updates: list[dict] = []

        product_result = await self._session.execute(
            select(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.updated_at > since,
            )
        )
        for product in product_result.scalars().all():
            updates.append(
                {
                    "entity": "product",
                    "id": str(product.id),
                    "operation": "delete" if product.deleted_at else "upsert",
                    "version": product.version,
                    "updated_at": product.updated_at,
                    "data": {
                        "id": str(product.id),
                        "name": product.name,
                        "price": str(product.price),
                        "stock": product.stock,
                        "category": product.category,
                        "min_stock": product.min_stock,
                        "unit": product.unit,
                        "photo_url": product.photo_url,
                        "qr_code": product.qr_code,
                        "deleted_at": product.deleted_at,
                    },
                }
            )

        sale_result = await self._session.execute(
            select(SaleModel)
            .where(SaleModel.store_id == store_id, SaleModel.created_at > since)
            .options(selectinload(SaleModel.items))
        )
        for sale in sale_result.scalars().all():
            updates.append(
                {
                    "entity": "sale",
                    "id": str(sale.id),
                    "operation": "upsert",
                    "version": sale.version,
                    "updated_at": sale.updated_at,
                    "data": {
                        "id": str(sale.id),
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
                }
            )

        return sorted(updates, key=lambda item: item["updated_at"])

    async def push_changes(self, store_id: UUID, changes: list[dict]) -> None:
        for change in changes:
            entity = change.get("entity")
            action = change.get("action") or change.get("operation", "upsert")
            data = change.get("data", {})

            if entity != "product":
                continue

            product_id = UUID(str(data["id"]))
            model = await self._session.get(ProductModel, product_id)

            if action == "delete":
                if model is not None and model.store_id == store_id:
                    model.deleted_at = datetime.now(timezone.utc)
                    model.is_active = False
                    model.updated_at = datetime.now(timezone.utc)
                continue

            if model is None:
                model = ProductModel(id=product_id, store_id=store_id)
                self._session.add(model)
            elif model.store_id != store_id:
                continue

            model.name = data["name"]
            model.price = data["price"]
            model.stock = data.get("stock", 0)
            model.category = data.get("category")
            model.min_stock = data.get("min_stock", 5)
            model.unit = data.get("unit", "unidad")
            model.photo_url = data.get("photo_url")
            model.qr_code = data.get("qr_code")
            model.version = (model.version or 0) + 1
            model.deleted_at = None
            model.is_active = True
            model.updated_at = datetime.now(timezone.utc)

        await self._session.flush()
