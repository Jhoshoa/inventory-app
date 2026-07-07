from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.report_dto import SalesReportDTO
from src.application.use_cases.reports.get_sales_report import (
    GetSalesReportInput,
    GetSalesReportUseCase,
)
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.presentation.dependencies import (
    get_current_user,
    get_sale_repo,
    get_store_repo,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/sales", response_model=SalesReportDTO)
async def get_sales_report(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    legacy_from: datetime | None = Query(default=None, alias="from"),
    legacy_to: datetime | None = Query(default=None, alias="to"),
    user: dict = Depends(get_current_user),
    sale_repo: SaleRepository = Depends(get_sale_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    return await GetSalesReportUseCase(sale_repo, store_repo).execute(
        GetSalesReportInput(
            store_id=UUID(str(user["store_id"])),
            from_date=from_date,
            to_date=to_date,
            legacy_from=legacy_from,
            legacy_to=legacy_to,
        )
    )
