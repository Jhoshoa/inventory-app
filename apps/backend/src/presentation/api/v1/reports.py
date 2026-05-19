from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.report_dto import SalesReportDTO
from src.application.use_cases.reports.get_sales_report import GetSalesReportInput, GetSalesReportUseCase
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.presentation.dependencies import get_current_user, get_sale_repo

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/sales", response_model=SalesReportDTO)
async def get_sales_report(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    user: dict = Depends(get_current_user),
    sale_repo: SaleRepository = Depends(get_sale_repo),
):
    return await GetSalesReportUseCase(sale_repo).execute(
        GetSalesReportInput(
            store_id=UUID(str(user["store_id"])),
            from_date=from_date,
            to_date=to_date,
        )
    )
