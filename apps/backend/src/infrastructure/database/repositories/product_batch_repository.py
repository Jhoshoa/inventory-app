from datetime import date
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.product_batch import NewBatch, ProductBatch
from src.domain.repositories.product_batch_repository import IProductBatchRepository
from src.infrastructure.database.models.product_batch_model import ProductBatchModel
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.repositories import batch_ledger


class ProductBatchRepository(IProductBatchRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def add(self, store_id: UUID, product_id: UUID, quantity: int, batch: NewBatch) -> ProductBatch:
        model = await batch_ledger.add_batch(
            self._session, store_id=store_id, product_id=product_id, quantity=quantity, batch=batch
        )
        await self._session.flush()
        stock = await self._session.scalar(
            select(ProductModel.stock).where(ProductModel.store_id == store_id, ProductModel.id == product_id)
        )
        await batch_ledger.enforce_limit(self._session, store_id=store_id, product_id=product_id, stock=stock or 0)
        await self._session.refresh(model)
        return self._to_entity(model)

    async def list_for_product(
        self, store_id: UUID, product_id: UUID, *, include_depleted: bool = False
    ) -> list[ProductBatch]:
        query = select(ProductBatchModel).where(
            ProductBatchModel.store_id == store_id,
            ProductBatchModel.product_id == product_id,
        )
        if not include_depleted:
            query = query.where(ProductBatchModel.quantity_remaining > 0)
        result = await self._session.execute(
            query.order_by(ProductBatchModel.expires_on.asc(), ProductBatchModel.created_at.asc()).limit(100)
        )
        return [self._to_entity(model) for model in result.scalars().all()]

    def _alerts_query(self, store_id: UUID, today: date):
        return (
            select(ProductBatchModel, ProductModel.name, ProductModel.unit)
            .join(ProductModel, ProductModel.id == ProductBatchModel.product_id)
            .where(
                ProductBatchModel.store_id == store_id,
                ProductBatchModel.quantity_remaining > 0,
                ProductBatchModel.alert_on <= today,
                ProductModel.deleted_at.is_(None),
            )
        )

    async def list_alerts(self, store_id: UUID, today: date, *, limit: int = 20) -> list[ProductBatch]:
        """Vencidos y por vencer, primero el que vence antes."""
        result = await self._session.execute(
            self._alerts_query(store_id, today)
            .order_by(ProductBatchModel.expires_on.asc(), ProductBatchModel.created_at.asc())
            .limit(limit)
        )
        return [
            self._to_entity(model, product_name=name, product_unit=unit) for model, name, unit in result.all()
        ]

    async def count_alerts(self, store_id: UUID, today: date) -> tuple[int, int]:
        expired = case((ProductBatchModel.expires_on < today, 1), else_=0)
        result = await self._session.execute(
            select(func.count(ProductBatchModel.id), func.coalesce(func.sum(expired), 0))
            .join(ProductModel, ProductModel.id == ProductBatchModel.product_id)
            .where(
                ProductBatchModel.store_id == store_id,
                ProductBatchModel.quantity_remaining > 0,
                ProductBatchModel.alert_on <= today,
                ProductModel.deleted_at.is_(None),
            )
        )
        total, expired_count = result.one()
        return int(total) - int(expired_count), int(expired_count)

    @staticmethod
    def _to_entity(
        model: ProductBatchModel, *, product_name: str | None = None, product_unit: str | None = None
    ) -> ProductBatch:
        return ProductBatch(
            id=model.id,
            store_id=model.store_id,
            product_id=model.product_id,
            expires_on=model.expires_on,
            alert_days=model.alert_days,
            quantity_initial=model.quantity_initial,
            quantity_remaining=model.quantity_remaining,
            created_at=model.created_at,
            product_name=product_name,
            product_unit=product_unit,
        )
