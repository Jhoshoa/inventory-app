from uuid import UUID

from fastapi import APIRouter, Depends

from src.application.dto.dashboard_dto import DashboardSummaryDTO
from src.application.use_cases.dashboard.get_dashboard_summary import GetDashboardSummaryUseCase
from src.infrastructure.database.repositories.exchange_rate_repository import ExchangeRateRepository
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.presentation.dependencies import get_current_user, get_exchange_rate_repo, get_product_repo, get_sale_repo

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryDTO)
async def get_dashboard_summary(
    user: dict = Depends(get_current_user),
    product_repo: ProductRepository = Depends(get_product_repo),
    sale_repo: SaleRepository = Depends(get_sale_repo),
    exchange_rate_repo: ExchangeRateRepository = Depends(get_exchange_rate_repo),
):
    return await GetDashboardSummaryUseCase(product_repo, sale_repo, exchange_rate_repo).execute(
        UUID(str(user["store_id"]))
    )
