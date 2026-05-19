from datetime import datetime
from uuid import UUID

from src.application.use_cases.exports.csv_helpers import default_from_to, write_csv
from src.domain.repositories.sale_repository import ISaleRepository


class ExportSalesCsvUseCase:
    headers = ["id", "created_at", "status", "payment_method", "total", "items_count", "customer_name", "device_id"]

    def __init__(self, repo: ISaleRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, from_date: datetime | None, to_date: datetime | None) -> str:
        start, end = default_from_to(from_date, to_date)
        rows = await self._repo.list_for_export(store_id, start, end)
        return write_csv(self.headers, rows)
