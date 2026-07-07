from dataclasses import dataclass
from uuid import UUID

from src.application.dto.cash_movement_dto import CashMovementResponseDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.cash_movements.create_cash_movement import _to_response
from src.domain.repositories.cash_movement_repository import ICashMovementRepository
from src.domain.repositories.store_business_day_repository import (
    IStoreBusinessDayRepository,
)


@dataclass
class VoidCashMovementInput:
    store_id: UUID
    movement_id: UUID
    voided_by_user_id: UUID
    void_reason: str


class VoidCashMovementUseCase:
    def __init__(
        self,
        movement_repo: ICashMovementRepository,
        business_day_repo: IStoreBusinessDayRepository,
    ):
        self._movement_repo = movement_repo
        self._business_day_repo = business_day_repo

    async def execute(self, input: VoidCashMovementInput) -> CashMovementResponseDTO:
        movement = await self._movement_repo.get_by_id(input.store_id, input.movement_id)
        if movement is None:
            raise NotFoundError("Movimiento de caja no encontrado")

        business_day = await self._business_day_repo.get_by_id(input.store_id, movement.business_day_id)
        if business_day is None:
            raise NotFoundError("Jornada no encontrada")
        if business_day.status != "open":
            raise ConflictError("Solo se pueden anular movimientos de una jornada abierta")

        movement.void(voided_by_user_id=input.voided_by_user_id, void_reason=input.void_reason)
        return _to_response(await self._movement_repo.update(movement))
