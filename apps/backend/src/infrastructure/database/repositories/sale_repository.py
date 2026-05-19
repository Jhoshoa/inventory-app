from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.sale import Sale, SaleItem
from src.domain.repositories.sale_repository import ISaleRepository
from src.infrastructure.database.models.sale_model import SaleModel, SaleItemModel


class SaleRepository(ISaleRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, sale: Sale) -> Sale:
        model = SaleModel(
            id=sale.id,
            store_id=sale.store_id,
            device_id=sale.device_id,
            customer_name=sale.customer_name,
            subtotal=sale.total,
            discount=0,
            total=sale.total,
            items_count=len(sale.items),
            payment_method=sale.payment_method,
            status=sale.status,
        )
        for item in sale.items:
            item_model = SaleItemModel(
                id=item.id,
                sale_id=sale.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            model.items.append(item_model)
        self._session.add(model)
        await self._session.flush()
        return sale

    async def get_by_id(self, store_id: UUID, sale_id: UUID) -> Sale | None:
        result = await self._session.execute(
            select(SaleModel)
            .where(SaleModel.store_id == store_id, SaleModel.id == sale_id, SaleModel.deleted_at.is_(None))
            .options(selectinload(SaleModel.items))
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        items = [
            SaleItem(id=i.id, product_id=i.product_id, product_name=i.product_name, quantity=i.quantity, unit_price=i.unit_price, subtotal=i.subtotal)
            for i in model.items
        ]
        return Sale(
            id=model.id,
            store_id=model.store_id,
            items=items,
            total=model.total,
            payment_method=model.payment_method,
            status=model.status,
            device_id=model.device_id,
            customer_name=model.customer_name,
            created_at=model.created_at,
            voided_at=model.voided_at,
            void_reason=model.void_reason,
        )

    async def list_by_store(self, store_id: UUID) -> list[Sale]:
        result = await self._session.execute(
            select(SaleModel)
            .where(SaleModel.store_id == store_id, SaleModel.deleted_at.is_(None))
            .options(selectinload(SaleModel.items))
            .order_by(SaleModel.created_at.desc())
        )
        sales = []
        for model in result.scalars().all():
            items = [
                SaleItem(id=i.id, product_id=i.product_id, product_name=i.product_name, quantity=i.quantity, unit_price=i.unit_price, subtotal=i.subtotal)
                for i in model.items
            ]
            sales.append(
                Sale(
                    id=model.id,
                    store_id=model.store_id,
                    items=items,
                    total=model.total,
                    payment_method=model.payment_method,
                    status=model.status,
                    device_id=model.device_id,
                    customer_name=model.customer_name,
                    created_at=model.created_at,
                    voided_at=model.voided_at,
                    void_reason=model.void_reason,
                )
            )
        return sales

    async def sales_summary_for_range(self, store_id: UUID, start: datetime, end: datetime) -> dict:
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(SaleModel.total), 0),
                func.count(SaleModel.id),
                func.coalesce(func.sum(SaleModel.items_count), 0),
            ).where(
                SaleModel.store_id == store_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.created_at >= start,
                SaleModel.created_at <= end,
            )
        )
        total, count, items_count = result.one()
        return {
            "total_sales": Decimal(str(total or 0)),
            "sales_count": int(count or 0),
            "items_count": int(items_count or 0),
        }

    async def latest_sales(self, store_id: UUID, limit: int = 5) -> list[Sale]:
        result = await self._session.execute(
            select(SaleModel)
            .where(SaleModel.store_id == store_id, SaleModel.deleted_at.is_(None))
            .options(selectinload(SaleModel.items))
            .order_by(SaleModel.created_at.desc())
            .limit(limit)
        )
        sales = []
        for model in result.scalars().all():
            items = [
                SaleItem(
                    id=i.id,
                    product_id=i.product_id,
                    product_name=i.product_name,
                    quantity=i.quantity,
                    unit_price=i.unit_price,
                    subtotal=i.subtotal,
                )
                for i in model.items
            ]
            sales.append(
                Sale(
                    id=model.id,
                    store_id=model.store_id,
                    items=items,
                    total=model.total,
                    payment_method=model.payment_method,
                    status=model.status,
                    device_id=model.device_id,
                    customer_name=model.customer_name,
                    created_at=model.created_at,
                    voided_at=model.voided_at,
                    void_reason=model.void_reason,
                )
            )
        return sales

    async def mark_voided(self, store_id: UUID, sale_id: UUID, reason: str) -> Sale | None:
        result = await self._session.execute(
            select(SaleModel)
            .where(SaleModel.store_id == store_id, SaleModel.id == sale_id, SaleModel.deleted_at.is_(None))
            .options(selectinload(SaleModel.items))
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        model.status = "voided"
        model.voided_at = datetime.now(timezone.utc)
        model.void_reason = reason
        model.version = (model.version or 0) + 1
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return await self.get_by_id(store_id, sale_id)

    async def list_for_export(self, store_id: UUID, start: datetime, end: datetime) -> list[dict]:
        result = await self._session.execute(
            select(SaleModel)
            .where(
                SaleModel.store_id == store_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.created_at >= start,
                SaleModel.created_at <= end,
            )
            .order_by(SaleModel.created_at.desc(), SaleModel.id.asc())
        )
        return [
            {
                "id": model.id,
                "created_at": model.created_at,
                "status": model.status,
                "payment_method": model.payment_method,
                "total": model.total,
                "items_count": model.items_count,
                "customer_name": model.customer_name,
                "device_id": model.device_id,
            }
            for model in result.scalars().all()
        ]

    async def totals_by_payment_method(self, store_id: UUID, start: datetime, end: datetime) -> list[dict]:
        result = await self._session.execute(
            select(
                SaleModel.payment_method,
                func.coalesce(func.sum(SaleModel.total), 0).label("total"),
                func.count(SaleModel.id).label("count"),
            )
            .where(
                SaleModel.store_id == store_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.created_at >= start,
                SaleModel.created_at <= end,
            )
            .group_by(SaleModel.payment_method)
            .order_by(func.coalesce(func.sum(SaleModel.total), 0).desc())
        )
        return [
            {"payment_method": payment_method, "total": Decimal(str(total or 0)), "count": int(count or 0)}
            for payment_method, total, count in result.all()
        ]

    async def top_products(self, store_id: UUID, start: datetime, end: datetime, limit: int = 5) -> list[dict]:
        result = await self._session.execute(
            select(
                SaleItemModel.product_id,
                SaleItemModel.product_name,
                func.coalesce(func.sum(SaleItemModel.quantity), 0).label("quantity"),
                func.coalesce(func.sum(SaleItemModel.subtotal), 0).label("total"),
            )
            .join(SaleModel, SaleModel.id == SaleItemModel.sale_id)
            .where(
                SaleModel.store_id == store_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.created_at >= start,
                SaleModel.created_at <= end,
            )
            .group_by(SaleItemModel.product_id, SaleItemModel.product_name)
            .order_by(func.coalesce(func.sum(SaleItemModel.quantity), 0).desc())
            .limit(limit)
        )
        return [
            {
                "product_id": product_id,
                "product_name": product_name,
                "quantity": int(quantity or 0),
                "total": Decimal(str(total or 0)),
            }
            for product_id, product_name, quantity, total in result.all()
        ]
