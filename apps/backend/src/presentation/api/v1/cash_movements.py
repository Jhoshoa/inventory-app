from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.cash_movement_dto import (
    CashMovementListResponseDTO,
    CashMovementResponseDTO,
    CreateCashMovementDTO,
    VoidCashMovementDTO,
)
from src.application.use_cases.auth.get_current_user_context import CurrentUserContext
from src.application.use_cases.cash_movements.create_cash_movement import (
    CreateCashMovementInput,
    CreateCashMovementUseCase,
)
from src.application.use_cases.cash_movements.list_cash_movements import (
    ListCashMovementsInput,
    ListCashMovementsUseCase,
)
from src.application.use_cases.cash_movements.void_cash_movement import (
    VoidCashMovementInput,
    VoidCashMovementUseCase,
)
from src.infrastructure.database.repositories.cash_movement_repository import (
    CashMovementRepository,
)
from src.infrastructure.database.repositories.store_business_day_repository import (
    StoreBusinessDayRepository,
)
from src.presentation.dependencies import (
    get_cash_movement_repo,
    get_store_business_day_repo,
    require_owner,
)

router = APIRouter(prefix="/cash-movements", tags=["cash-movements"])


@router.post("", response_model=CashMovementResponseDTO, status_code=201)
async def create_cash_movement(
    dto: CreateCashMovementDTO,
    user: CurrentUserContext = Depends(require_owner),
    movement_repo: CashMovementRepository = Depends(get_cash_movement_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
):
    return await CreateCashMovementUseCase(movement_repo, business_day_repo).execute(
        CreateCashMovementInput(
            store_id=UUID(str(user.store_id)),
            created_by_user_id=UUID(str(user.id)),
            movement_type=dto.movement_type,
            amount=dto.amount,
            note=dto.note,
        )
    )


@router.get("", response_model=CashMovementListResponseDTO)
async def list_cash_movements(
    business_day_id: UUID | None = None,
    movement_type: str | None = Query(default=None, alias="type", max_length=30),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    include_voided: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: CurrentUserContext = Depends(require_owner),
    movement_repo: CashMovementRepository = Depends(get_cash_movement_repo),
):
    if movement_type == "all":
        movement_type = None
    return await ListCashMovementsUseCase(movement_repo).execute(
        ListCashMovementsInput(
            store_id=UUID(str(user.store_id)),
            business_day_id=business_day_id,
            movement_type=movement_type,
            from_date=from_date,
            to_date=to_date,
            include_voided=include_voided,
            limit=limit,
            offset=offset,
        )
    )


@router.post("/{movement_id}/void", response_model=CashMovementResponseDTO)
async def void_cash_movement(
    movement_id: UUID,
    dto: VoidCashMovementDTO,
    user: CurrentUserContext = Depends(require_owner),
    movement_repo: CashMovementRepository = Depends(get_cash_movement_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
):
    return await VoidCashMovementUseCase(movement_repo, business_day_repo).execute(
        VoidCashMovementInput(
            store_id=UUID(str(user.store_id)),
            movement_id=movement_id,
            voided_by_user_id=UUID(str(user.id)),
            void_reason=dto.void_reason,
        )
    )
