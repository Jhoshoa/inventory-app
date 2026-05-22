from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.store_day_dto import (
    StoreDayActionDTO,
    StoreDayCloseActionDTO,
    StoreDayCloseReportDTO,
    StoreDayCloseReportListDTO,
    StoreDayClosingPreviewDTO,
    StoreDayEventResponseDTO,
    StoreDayResponseDTO,
)
from src.application.use_cases.store_day.close_store_day import CloseStoreDayInput, CloseStoreDayUseCase
from src.application.use_cases.store_day.get_close_report import (
    GetCloseReportInput,
    GetCloseReportUseCase,
    GetCurrentCloseReportInput,
    GetCurrentCloseReportUseCase,
)
from src.application.use_cases.store_day.get_closing_preview import GetClosingPreviewInput, GetClosingPreviewUseCase
from src.application.use_cases.store_day.get_current_store_day import GetCurrentStoreDayInput, GetCurrentStoreDayUseCase
from src.application.use_cases.store_day.list_close_reports import ListCloseReportsInput, ListCloseReportsUseCase
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
            opening_cash_amount=dto.opening_cash_amount if dto else None,
        )
    )


@router.post("/close", response_model=StoreDayResponseDTO)
async def close_store_day(
    dto: StoreDayCloseActionDTO,
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
            closing_note=dto.closing_note,
            counted_cash_amount=None if dto.skip_cash_count else dto.counted_cash_amount,
        )
    )


@router.get("/current/closing-preview", response_model=StoreDayClosingPreviewDTO)
async def get_closing_preview(
    user: CurrentUserContext = Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
    sale_repo: SaleRepository = Depends(get_sale_repo),
):
    return await GetClosingPreviewUseCase(store_repo, business_day_repo, sale_repo).execute(
        GetClosingPreviewInput(store_id=UUID(str(user.store_id)))
    )


@router.get("/current/close-report", response_model=StoreDayCloseReportDTO)
async def get_current_close_report(
    user: CurrentUserContext = Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
):
    return await GetCurrentCloseReportUseCase(store_repo, business_day_repo).execute(
        GetCurrentCloseReportInput(store_id=UUID(str(user.store_id)))
    )


@router.get("/reports", response_model=StoreDayCloseReportListDTO)
async def list_close_reports(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: CurrentUserContext = Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
):
    return await ListCloseReportsUseCase(store_repo, business_day_repo).execute(
        ListCloseReportsInput(
            store_id=UUID(str(user.store_id)),
            from_date=from_date,
            to_date=to_date,
            limit=limit,
            offset=offset,
        )
    )


@router.get("/reports/{business_day_id}", response_model=StoreDayCloseReportDTO)
async def get_close_report(
    business_day_id: UUID,
    user: CurrentUserContext = Depends(require_owner),
    business_day_repo: StoreBusinessDayRepository = Depends(get_store_business_day_repo),
):
    return await GetCloseReportUseCase(business_day_repo).execute(
        GetCloseReportInput(store_id=UUID(str(user.store_id)), business_day_id=business_day_id)
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
