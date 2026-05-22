from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from src.application.dto.cash_movement_dto import CashMovementResponseDTO
from src.application.exceptions import ConflictError
from src.domain.entities.cash_movement import CashMovement
from src.domain.repositories.cash_movement_repository import ICashMovementRepository
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository


@dataclass
class CreateCashMovementInput:
    store_id: UUID
    created_by_user_id: UUID
    movement_type: str
    amount: Decimal
    note: str | None = None


class CreateCashMovementUseCase:
    def __init__(
        self,
        movement_repo: ICashMovementRepository,
        business_day_repo: IStoreBusinessDayRepository,
    ):
        self._movement_repo = movement_repo
        self._business_day_repo = business_day_repo

    async def execute(self, input: CreateCashMovementInput) -> CashMovementResponseDTO:
        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            raise ConflictError("No hay una jornada abierta para registrar movimientos de caja")

        movement = CashMovement.create(
            store_id=input.store_id,
            business_day_id=business_day.id,
            movement_type=input.movement_type,
            amount=input.amount,
            created_by_user_id=input.created_by_user_id,
            note=input.note,
        )
        return _to_response(await self._movement_repo.save(movement))


def _to_response(movement: CashMovement) -> CashMovementResponseDTO:
    return CashMovementResponseDTO(
        id=movement.id,
        store_id=movement.store_id,
        business_day_id=movement.business_day_id,
        movement_type=movement.movement_type,
        direction=movement.direction,
        amount=movement.amount,
        note=movement.note,
        created_by_user_id=movement.created_by_user_id,
        occurred_at=movement.occurred_at,
        created_at=movement.created_at,
        voided_at=movement.voided_at,
        voided_by_user_id=movement.voided_by_user_id,
        void_reason=movement.void_reason,
    )
