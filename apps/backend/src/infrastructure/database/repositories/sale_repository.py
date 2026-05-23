from uuid import UUID
from datetime import date, datetime, timezone
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
            business_day_id=sale.business_day_id,
            business_date=sale.business_date,
            created_by_user_id=sale.created_by_user_id,
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
        return self._to_entity(model)

    async def list_by_store(
        self,
        store_id: UUID,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        status: str = "all",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Sale], int]:
        filters = [SaleModel.store_id == store_id, SaleModel.deleted_at.is_(None)]
        if from_date is not None:
            filters.append(SaleModel.business_date >= from_date)
        if to_date is not None:
            filters.append(SaleModel.business_date <= to_date)
        if status != "all":
            filters.append(SaleModel.status == status)

        total_result = await self._session.execute(select(func.count(SaleModel.id)).where(*filters))
        result = await self._session.execute(
            select(SaleModel)
            .where(*filters)
            .options(selectinload(SaleModel.items))
            .order_by(SaleModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        sales = []
        for model in result.scalars().all():
            sales.append(self._to_entity(model))
        return sales, int(total_result.scalar_one() or 0)

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
                SaleModel.created_at < end,
                SaleModel.status == "completed",
            )
        )
        total, count, items_count = result.one()
        return {
            "total_sales": Decimal(str(total or 0)),
            "sales_count": int(count or 0),
            "items_count": int(items_count or 0),
        }

    async def sales_summary_for_business_date_range(self, store_id: UUID, from_date: date, to_date: date) -> dict:
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(SaleModel.total), 0),
                func.count(SaleModel.id),
                func.coalesce(func.sum(SaleModel.items_count), 0),
            ).where(*self._business_date_filters(store_id, from_date, to_date), SaleModel.status == "completed")
        )
        total, count, items_count = result.one()
        return {
            "total_sales": Decimal(str(total or 0)),
            "sales_count": int(count or 0),
            "items_count": int(items_count or 0),
        }

    async def sales_summary_for_business_day(self, store_id: UUID, business_day_id: UUID) -> dict:
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(SaleModel.total), 0),
                func.count(SaleModel.id),
                func.coalesce(func.sum(SaleModel.items_count), 0),
            ).where(
                SaleModel.store_id == store_id,
                SaleModel.business_day_id == business_day_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.status == "completed",
            )
        )
        total, count, items_count = result.one()
        voided_result = await self._session.execute(
            select(func.count(SaleModel.id)).where(
                SaleModel.store_id == store_id,
                SaleModel.business_day_id == business_day_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.status == "voided",
            )
        )
        return {
            "total_sales": Decimal(str(total or 0)),
            "sales_count": int(count or 0),
            "items_count": int(items_count or 0),
            "voided_sales_count": int(voided_result.scalar_one() or 0),
        }

    async def sales_closing_summary_for_business_day(self, store_id: UUID, business_day_id: UUID) -> dict:
        summary = await self.sales_summary_for_business_day(store_id, business_day_id)
        payment_result = await self._session.execute(
            select(
                SaleModel.payment_method,
                func.coalesce(func.sum(SaleModel.total), 0),
            ).where(
                SaleModel.store_id == store_id,
                SaleModel.business_day_id == business_day_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.status == "completed",
            ).group_by(SaleModel.payment_method)
        )
        totals = {
            "cash_sales_total": Decimal("0"),
            "qr_sales_total": Decimal("0"),
            "transfer_sales_total": Decimal("0"),
            "card_sales_total": Decimal("0"),
        }
        mapping = {
            "efectivo": "cash_sales_total",
            "qr": "qr_sales_total",
            "transferencia": "transfer_sales_total",
            "tarjeta": "card_sales_total",
        }
        for payment_method, total in payment_result.all():
            key = mapping.get(payment_method)
            if key:
                totals[key] = Decimal(str(total or 0))
        return {**summary, **totals}

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
            sales.append(self._to_entity(model))
        return sales

    async def latest_sales_for_range(
        self,
        store_id: UUID,
        start: datetime,
        end: datetime,
        limit: int = 5,
    ) -> list[Sale]:
        result = await self._session.execute(
            select(SaleModel)
            .where(
                SaleModel.store_id == store_id,
                SaleModel.deleted_at.is_(None),
                SaleModel.created_at >= start,
                SaleModel.created_at < end,
            )
            .options(selectinload(SaleModel.items))
            .order_by(SaleModel.created_at.desc())
            .limit(limit)
        )
        return [self._to_entity(model) for model in result.scalars().all()]

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
                SaleModel.created_at < end,
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
                SaleModel.created_at < end,
                SaleModel.status == "completed",
            )
            .group_by(SaleModel.payment_method)
            .order_by(func.coalesce(func.sum(SaleModel.total), 0).desc())
        )
        return [
            {"payment_method": payment_method, "total": Decimal(str(total or 0)), "count": int(count or 0)}
            for payment_method, total, count in result.all()
        ]

    async def totals_by_payment_method_for_business_date_range(
        self,
        store_id: UUID,
        from_date: date,
        to_date: date,
    ) -> list[dict]:
        result = await self._session.execute(
            select(
                SaleModel.payment_method,
                func.coalesce(func.sum(SaleModel.total), 0).label("total"),
                func.count(SaleModel.id).label("count"),
            )
            .where(*self._business_date_filters(store_id, from_date, to_date), SaleModel.status == "completed")
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
                SaleModel.created_at < end,
                SaleModel.status == "completed",
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

    async def top_products_for_business_date_range(
        self,
        store_id: UUID,
        from_date: date,
        to_date: date,
        limit: int = 5,
    ) -> list[dict]:
        result = await self._session.execute(
            select(
                SaleItemModel.product_id,
                SaleItemModel.product_name,
                func.coalesce(func.sum(SaleItemModel.quantity), 0).label("quantity"),
                func.coalesce(func.sum(SaleItemModel.subtotal), 0).label("total"),
            )
            .join(SaleModel, SaleModel.id == SaleItemModel.sale_id)
            .where(*self._business_date_filters(store_id, from_date, to_date), SaleModel.status == "completed")
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

    def _business_date_filters(self, store_id: UUID, from_date: date, to_date: date) -> list:
        return [
            SaleModel.store_id == store_id,
            SaleModel.deleted_at.is_(None),
            SaleModel.business_date >= from_date,
            SaleModel.business_date <= to_date,
        ]

    def _to_entity(self, model: SaleModel) -> Sale:
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
        return Sale(
            id=model.id,
            store_id=model.store_id,
            items=items,
            total=model.total,
            payment_method=model.payment_method,
            status=model.status,
            business_day_id=model.business_day_id,
            business_date=model.business_date,
            created_by_user_id=model.created_by_user_id,
            device_id=model.device_id,
            customer_name=model.customer_name,
            created_at=model.created_at,
            voided_at=model.voided_at,
            void_reason=model.void_reason,
        )
