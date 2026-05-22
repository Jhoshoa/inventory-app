from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.cash_movement import CASH_MOVEMENT_OUT_TYPES, CashMovement
from src.domain.repositories.cash_movement_repository import ICashMovementRepository
from src.infrastructure.database.models.cash_movement_model import CashMovementModel


class CashMovementRepository(ICashMovementRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, movement: CashMovement) -> CashMovement:
        model = CashMovementModel(
            id=movement.id,
            store_id=movement.store_id,
            business_day_id=movement.business_day_id,
            movement_type=movement.movement_type,
            amount=movement.amount,
            note=movement.note,
            created_by_user_id=movement.created_by_user_id,
            occurred_at=movement.occurred_at,
            created_at=movement.created_at,
            voided_at=movement.voided_at,
            voided_by_user_id=movement.voided_by_user_id,
            void_reason=movement.void_reason,
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def get_by_id(self, store_id: UUID, movement_id: UUID) -> CashMovement | None:
        result = await self._session.execute(
            select(CashMovementModel).where(
                CashMovementModel.store_id == store_id,
                CashMovementModel.id == movement_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def search(
        self,
        store_id: UUID,
        *,
        business_day_id: UUID | None = None,
        movement_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        include_voided: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CashMovement], int]:
        filters = [CashMovementModel.store_id == store_id]
        if business_day_id is not None:
            filters.append(CashMovementModel.business_day_id == business_day_id)
        if movement_type is not None:
            filters.append(CashMovementModel.movement_type == movement_type)
        if from_date is not None:
            filters.append(func.date(CashMovementModel.occurred_at) >= from_date)
        if to_date is not None:
            filters.append(func.date(CashMovementModel.occurred_at) <= to_date)
        if not include_voided:
            filters.append(CashMovementModel.voided_at.is_(None))

        total_result = await self._session.execute(select(func.count(CashMovementModel.id)).where(*filters))
        result = await self._session.execute(
            select(CashMovementModel)
            .where(*filters)
            .order_by(CashMovementModel.occurred_at.desc(), CashMovementModel.id.asc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(model) for model in result.scalars().all()], int(total_result.scalar_one() or 0)

    async def summary_for_business_day(self, store_id: UUID, business_day_id: UUID) -> dict:
        result = await self._session.execute(
            select(CashMovementModel.movement_type, func.coalesce(func.sum(CashMovementModel.amount), 0), func.count())
            .where(
                CashMovementModel.store_id == store_id,
                CashMovementModel.business_day_id == business_day_id,
                CashMovementModel.voided_at.is_(None),
            )
            .group_by(CashMovementModel.movement_type)
        )
        in_total = Decimal("0")
        out_total = Decimal("0")
        count = 0
        by_type: dict[str, Decimal] = {}
        for movement_type, total, type_count in result.all():
            amount = Decimal(str(total or 0))
            by_type[str(movement_type)] = amount
            count += int(type_count or 0)
            if movement_type in CASH_MOVEMENT_OUT_TYPES:
                out_total += amount
            else:
                in_total += amount
        return {
            "cash_movements_in_total": in_total,
            "cash_movements_out_total": out_total,
            "cash_movements_count": count,
            "cash_movements_by_type": by_type,
        }

    async def update(self, movement: CashMovement) -> CashMovement:
        model = await self._session.get(CashMovementModel, movement.id)
        if model is None or model.store_id != movement.store_id:
            raise ValueError("Movimiento de caja no encontrado")
        model.voided_at = movement.voided_at
        model.voided_by_user_id = movement.voided_by_user_id
        model.void_reason = movement.void_reason
        await self._session.flush()
        return self._to_entity(model)

    def _to_entity(self, model: CashMovementModel) -> CashMovement:
        return CashMovement(
            id=model.id,
            store_id=model.store_id,
            business_day_id=model.business_day_id,
            movement_type=model.movement_type,
            amount=model.amount,
            note=model.note,
            created_by_user_id=model.created_by_user_id,
            occurred_at=model.occurred_at,
            created_at=model.created_at,
            voided_at=model.voided_at,
            voided_by_user_id=model.voided_by_user_id,
            void_reason=model.void_reason,
        )
