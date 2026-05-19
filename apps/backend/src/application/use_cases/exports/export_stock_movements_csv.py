from datetime import datetime
from uuid import UUID

from src.application.use_cases.exports.csv_helpers import default_from_to, write_csv
from src.domain.repositories.stock_movement_repository import IStockMovementRepository


class ExportStockMovementsCsvUseCase:
    headers = [
        "id",
        "created_at",
        "product_id",
        "sale_id",
        "movement_type",
        "quantity_delta",
        "stock_after",
        "reason",
        "device_id",
    ]

    def __init__(self, repo: IStockMovementRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, from_date: datetime | None, to_date: datetime | None) -> str:
        start, end = default_from_to(from_date, to_date)
        movements = await self._repo.list_for_export(store_id, from_date=start, to_date=end)
        rows = [
            {
                "id": movement.id,
                "created_at": movement.created_at,
                "product_id": movement.product_id,
                "sale_id": movement.sale_id,
                "movement_type": movement.movement_type,
                "quantity_delta": movement.quantity_delta,
                "stock_after": movement.stock_after,
                "reason": movement.reason,
                "device_id": movement.device_id,
            }
            for movement in movements
        ]
        return write_csv(self.headers, rows)
