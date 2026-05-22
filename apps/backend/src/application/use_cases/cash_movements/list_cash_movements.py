from dataclasses import dataclass
from datetime import date
from uuid import UUID

from src.application.dto.cash_movement_dto import CashMovementListResponseDTO
from src.application.use_cases.cash_movements.create_cash_movement import _to_response
from src.domain.repositories.cash_movement_repository import ICashMovementRepository


@dataclass
class ListCashMovementsInput:
    store_id: UUID
    business_day_id: UUID | None = None
    movement_type: str | None = None
    from_date: date | None = None
    to_date: date | None = None
    include_voided: bool = False
    limit: int = 50
    offset: int = 0


class ListCashMovementsUseCase:
    def __init__(self, movement_repo: ICashMovementRepository):
        self._movement_repo = movement_repo

    async def execute(self, input: ListCashMovementsInput) -> CashMovementListResponseDTO:
        if input.from_date and input.to_date and input.from_date > input.to_date:
            raise ValueError("La fecha inicial no puede ser mayor a la fecha final")
        movements, total = await self._movement_repo.search(
            input.store_id,
            business_day_id=input.business_day_id,
            movement_type=input.movement_type,
            from_date=input.from_date,
            to_date=input.to_date,
            include_voided=input.include_voided,
            limit=input.limit,
            offset=input.offset,
        )
        return CashMovementListResponseDTO(
            items=[_to_response(movement) for movement in movements],
            total=total,
            limit=input.limit,
            offset=input.offset,
            from_date=input.from_date,
            to_date=input.to_date,
        )
