from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from src.application.use_cases.exports.export_products_csv import ExportProductsCsvUseCase
from src.application.use_cases.exports.export_sales_csv import ExportSalesCsvUseCase
from src.application.use_cases.exports.export_stock_movements_csv import ExportStockMovementsCsvUseCase
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.stock_movement_repository import StockMovementRepository
from src.presentation.dependencies import get_product_repo, get_sale_repo, get_stock_movement_repo, require_owner

router = APIRouter(prefix="/exports", tags=["exports"])


def _csv_response(content: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/products.csv")
async def export_products_csv(
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
):
    content = await ExportProductsCsvUseCase(repo).execute(user.store_id)
    return _csv_response(content, "products.csv")


@router.get("/sales.csv")
async def export_sales_csv(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    user=Depends(require_owner),
    repo: SaleRepository = Depends(get_sale_repo),
):
    content = await ExportSalesCsvUseCase(repo).execute(user.store_id, from_date, to_date)
    return _csv_response(content, "sales.csv")


@router.get("/stock-movements.csv")
async def export_stock_movements_csv(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    user=Depends(require_owner),
    repo: StockMovementRepository = Depends(get_stock_movement_repo),
):
    content = await ExportStockMovementsCsvUseCase(repo).execute(user.store_id, from_date, to_date)
    return _csv_response(content, "stock-movements.csv")
