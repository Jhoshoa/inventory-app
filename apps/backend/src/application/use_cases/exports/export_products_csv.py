from uuid import UUID

from src.application.use_cases.exports.csv_helpers import write_csv
from src.domain.repositories.product_repository import IProductRepository


class ExportProductsCsvUseCase:
    headers = [
        "id",
        "name",
        "category",
        "sku",
        "unit",
        "price",
        "cost_price",
        "stock",
        "min_stock",
        "qr_code",
        "is_active",
    ]

    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, store_id: UUID) -> str:
        products = await self._repo.list_for_export(store_id)
        rows = [
            {
                "id": product.id,
                "name": product.name,
                "category": product.category,
                "sku": product.sku,
                "unit": product.unit,
                "price": product.price,
                "cost_price": product.cost_price,
                "stock": product.stock,
                "min_stock": product.min_stock,
                "qr_code": product.qr_code,
                "is_active": product.is_active,
            }
            for product in products
        ]
        return write_csv(self.headers, rows)
