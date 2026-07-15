from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.stock_movement import StockMovement
from src.domain.repositories.stock_movement_repository import IStockMovementRepository
from src.infrastructure.database.models.stock_movement_model import StockMovementModel


class StockMovementRepository(IStockMovementRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_product(
        self,
        store_id: UUID,
        product_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[StockMovement], int]:
        return await self.search(store_id, product_id=product_id, limit=limit, offset=offset)

    async def search(
        self,
        store_id: UUID,
        *,
        product_id: UUID | None = None,
        movement_type: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[StockMovement], int]:
        filters = [StockMovementModel.store_id == store_id]
        if product_id is not None:
            filters.append(StockMovementModel.product_id == product_id)
        if movement_type is not None:
            filters.append(StockMovementModel.movement_type == movement_type)
        if from_date is not None:
            filters.append(StockMovementModel.created_at >= from_date)
        if to_date is not None:
            filters.append(StockMovementModel.created_at <= to_date)

        total_result = await self._session.execute(
            select(func.count()).select_from(StockMovementModel).where(*filters)
        )
        result = await self._session.execute(
            select(StockMovementModel)
            .where(*filters)
            .order_by(StockMovementModel.created_at.desc(), StockMovementModel.id.asc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(model) for model in result.scalars().all()], int(total_result.scalar_one())

    async def list_for_export(
        self,
        store_id: UUID,
        *,
        from_date: datetime,
        to_date: datetime,
    ) -> list[StockMovement]:
        filters = [StockMovementModel.store_id == store_id]
        if from_date is not None:
            filters.append(StockMovementModel.created_at >= from_date)
        if to_date is not None:
            filters.append(StockMovementModel.created_at <= to_date)

        stmt = (
            select(StockMovementModel)
            .where(*filters)
            .order_by(StockMovementModel.created_at.desc(), StockMovementModel.id.asc())
            .execution_options(stream_results=True)
        )
        movements: list[StockMovement] = []
        async for partition in (await self._session.stream(stmt)).scalars().partitions(500):
            for model in partition:
                movements.append(self._to_entity(model))
        return movements

    def _to_entity(self, model: StockMovementModel) -> StockMovement:
        return StockMovement(
            id=model.id,
            store_id=model.store_id,
            product_id=model.product_id,
            sale_id=model.sale_id,
            movement_type=model.movement_type,
            quantity_delta=model.quantity_delta,
            stock_after=model.stock_after,
            reason=model.reason,
            device_id=model.device_id,
            created_at=model.created_at,
        )
