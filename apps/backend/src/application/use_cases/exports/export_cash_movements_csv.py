from datetime import datetime
from uuid import UUID

from src.application.use_cases.exports.csv_helpers import default_from_to, write_csv
from src.domain.repositories.cash_movement_repository import ICashMovementRepository


class ExportCashMovementsCsvUseCase:
    headers = [
        "id",
        "occurred_at",
        "business_day_id",
        "movement_type",
        "direction",
        "amount",
        "note",
        "created_by_user_id",
        "voided_at",
        "voided_by_user_id",
        "void_reason",
    ]

    def __init__(self, repo: ICashMovementRepository):
        self._repo = repo

    async def execute(
        self,
        store_id: UUID,
        from_date: datetime | None,
        to_date: datetime | None,
        movement_type: str | None = None,
    ) -> str:
        start, end = default_from_to(from_date, to_date)
        if movement_type == "all":
            movement_type = None
        movements = await self._repo.list_for_export(
            store_id,
            from_date=start,
            to_date=end,
            movement_type=movement_type,
        )
        rows = [
            {
                "id": movement.id,
                "occurred_at": movement.occurred_at,
                "business_day_id": movement.business_day_id,
                "movement_type": movement.movement_type,
                "direction": movement.direction,
                "amount": movement.amount,
                "note": movement.note,
                "created_by_user_id": movement.created_by_user_id,
                "voided_at": movement.voided_at,
                "voided_by_user_id": movement.voided_by_user_id,
                "void_reason": movement.void_reason,
            }
            for movement in movements
        ]
        return write_csv(self.headers, rows)
