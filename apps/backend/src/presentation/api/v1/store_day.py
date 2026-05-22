from uuid import UUID

from fastapi import APIRouter, Depends

from src.application.dto.store_day_dto import StoreDayActionDTO, StoreDayEventResponseDTO, StoreDayResponseDTO
from src.application.use_cases.store_day.close_store_day import CloseStoreDayInput, CloseStoreDayUseCase
from src.application.use_cases.store_day.get_current_store_day import GetCurrentStoreDayInput, GetCurrentStoreDayUseCase
from src.application.use_cases.store_day.list_current_store_day_events import (
    ListCurrentStoreDayEventsInput,
    ListCurrentStoreDayEventsUseCase,
)
from src.application.use_cases.store_day.open_store_day import OpenStoreDayInput, OpenStoreDayUseCase
from src.application.use_cases.store_day.reopen_store_day import ReopenStoreDayInput, ReopenStoreDayUseCase
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.store_business_day_event_repository import StoreBusinessDayEventRepository
from src.infrastructure.database.repositories.store_business_day_repository import StoreBusinessDayRepository
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.presentation.dependencies import (
    get_sale_repo,
    get_store_business_day_event_repo,
    get_store_business_day_repo,
    get_store_repo,
    require_active_user,
    require_owner,
)
from src.application.use_cases.auth.get_current_user_context import CurrentUserContext

router = APIRouter(prefix="/store-day", tags=["store-day"])


@router.get("/current", response_model=StoreDayResponseDTO)
async def get_current_store_day(
    user: CurrentUserContext = Depends(require_active_user),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
):
    return await GetCurrentStoreDayUseCase(store_repo, business_day_repo).execute(
        GetCurrentStoreDayInput(store_id=UUID(str(user.store_id)))
    )


@router.get("/current/events", response_model=list[StoreDayEventResponseDTO])
async def list_current_store_day_events(
    user: CurrentUserContext = Depends(require_active_user),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
    event_repo: StoreBusinessDayEventRepository = Depends(get_store_business_day_event_repo),
):
    return await ListCurrentStoreDayEventsUseCase(store_repo, business_day_repo, event_repo).execute(
        ListCurrentStoreDayEventsInput(store_id=UUID(str(user.store_id)))
    )


@router.post("/open", response_model=StoreDayResponseDTO, status_code=201)
async def open_store_day(
    dto: StoreDayActionDTO | None = None,
    user: CurrentUserContext = Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
    event_repo: StoreBusinessDayEventRepository = Depends(get_store_business_day_event_repo),
):
    return await OpenStoreDayUseCase(store_repo, business_day_repo, event_repo).execute(
        OpenStoreDayInput(
            store_id=UUID(str(user.store_id)),
            opened_by_user_id=UUID(str(user.id)),
            opening_note=dto.opening_note if dto else None,
        )
    )


@router.post("/close", response_model=StoreDayResponseDTO)
async def close_store_day(
    dto: StoreDayActionDTO | None = None,
    user: CurrentUserContext = Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
    event_repo: StoreBusinessDayEventRepository = Depends(get_store_business_day_event_repo),
    sale_repo: SaleRepository = Depends(get_sale_repo),
):
    return await CloseStoreDayUseCase(store_repo, business_day_repo, event_repo, sale_repo).execute(
        CloseStoreDayInput(
            store_id=UUID(str(user.store_id)),
            closed_by_user_id=UUID(str(user.id)),
            closing_note=dto.closing_note if dto else None,
        )
    )


@router.post("/reopen", response_model=StoreDayResponseDTO)
async def reopen_store_day(
    dto: StoreDayActionDTO | None = None,
    user: CurrentUserContext = Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
    event_repo: StoreBusinessDayEventRepository = Depends(get_store_business_day_event_repo),
):
    return await ReopenStoreDayUseCase(store_repo, business_day_repo, event_repo).execute(
        ReopenStoreDayInput(
            store_id=UUID(str(user.store_id)),
            opened_by_user_id=UUID(str(user.id)),
            opening_note=dto.opening_note if dto else None,
        )
    )
