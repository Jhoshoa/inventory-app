from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.dashboard_dto import DashboardSummaryDTO
from src.application.use_cases.dashboard.get_dashboard_summary import (
    GetDashboardSummaryInput,
    GetDashboardSummaryUseCase,
)
from src.infrastructure.database.repositories.exchange_rate_repository import (
    ExchangeRateRepository,
)
from src.infrastructure.database.repositories.product_repository import (
    ProductRepository,
)
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.presentation.dependencies import (
    get_current_user,
    get_exchange_rate_repo,
    get_product_repo,
    get_sale_repo,
    get_store_repo,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryDTO)
async def get_dashboard_summary(
    scope: str = Query(default="today"),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    user: dict = Depends(get_current_user),
    product_repo: ProductRepository = Depends(get_product_repo),
    sale_repo: SaleRepository = Depends(get_sale_repo),
    exchange_rate_repo: ExchangeRateRepository = Depends(get_exchange_rate_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    return await GetDashboardSummaryUseCase(product_repo, sale_repo, exchange_rate_repo, store_repo).execute(
        GetDashboardSummaryInput(
            store_id=UUID(str(user["store_id"])),
            scope=scope,
            from_date=from_date,
            to_date=to_date,
        )
    )
