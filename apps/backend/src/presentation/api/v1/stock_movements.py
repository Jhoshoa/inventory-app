from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.stock_movement_dto import StockMovementListResponseDTO
from src.application.use_cases.stock_movements.list_stock_movements import (
    ListStockMovementsInput,
    ListStockMovementsUseCase,
)
from src.infrastructure.database.repositories.stock_movement_repository import StockMovementRepository
from src.presentation.dependencies import get_stock_movement_repo, require_active_user

router = APIRouter(prefix="/stock-movements", tags=["stock-movements"])


@router.get("", response_model=StockMovementListResponseDTO)
async def list_stock_movements(
    product_id: UUID | None = None,
    movement_type: str | None = Query(default=None, alias="type", max_length=40),
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_active_user),
    repo: StockMovementRepository = Depends(get_stock_movement_repo),
):
    movements, total = await ListStockMovementsUseCase(repo).execute(
        ListStockMovementsInput(
            store_id=user.store_id,
            product_id=product_id,
            movement_type=movement_type,
            from_date=from_date,
            to_date=to_date,
            limit=limit,
            offset=offset,
        )
    )
    return StockMovementListResponseDTO(items=movements, total=total, limit=limit, offset=offset)
