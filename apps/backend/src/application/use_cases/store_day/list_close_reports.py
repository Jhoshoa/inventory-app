from dataclasses import dataclass
from datetime import date
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayCloseReportListDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.date_ranges import BusinessDateRangeService
from src.application.use_cases.store_day._closing_report import (
    close_report_from_business_day,
)
from src.domain.repositories.store_business_day_repository import (
    IStoreBusinessDayRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class ListCloseReportsInput:
    store_id: UUID
    from_date: date | None = None
    to_date: date | None = None
    limit: int = 50
    offset: int = 0


class ListCloseReportsUseCase:
    def __init__(
        self,
        store_repo: IStoreRepository,
        business_day_repo: IStoreBusinessDayRepository,
        date_ranges: BusinessDateRangeService | None = None,
    ):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo
        self._date_ranges = date_ranges or BusinessDateRangeService()

    async def execute(self, input: ListCloseReportsInput) -> StoreDayCloseReportListDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        if input.from_date or input.to_date:
            from_date = input.from_date or input.to_date
            to_date = input.to_date or input.from_date
            if from_date is None or to_date is None:
                raise ValueError("Rango de fechas invalido")
            date_range = self._date_ranges.custom(
                from_date,
                to_date,
                store.timezone,
                first_business_date=store.first_business_date,
                clamp_to_first_business_date=True,
            )
        else:
            date_range = self._date_ranges.month(store.timezone, first_business_date=store.first_business_date)

        business_days, total = await self._business_day_repo.list_by_date_range(
            input.store_id,
            date_range.from_date,
            date_range.to_date,
            input.limit,
            input.offset,
        )
        reports = [
            close_report_from_business_day(day)
            for day in business_days
            if day.status == "closed" and day.closing_snapshot_at is not None
        ]
        return StoreDayCloseReportListDTO(
            items=reports,
            total=total if len(reports) == len(business_days) else len(reports),
            limit=input.limit,
            offset=input.offset,
            from_date=date_range.from_date,
            to_date=date_range.to_date,
        )
