from dataclasses import dataclass
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayCloseReportDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.store_day._business_date import local_business_date
from src.application.use_cases.store_day._closing_report import close_report_from_business_day
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class GetCurrentCloseReportInput:
    store_id: UUID


@dataclass
class GetCloseReportInput:
    store_id: UUID
    business_day_id: UUID


class GetCurrentCloseReportUseCase:
    def __init__(self, store_repo: IStoreRepository, business_day_repo: IStoreBusinessDayRepository):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo

    async def execute(self, input: GetCurrentCloseReportInput) -> StoreDayCloseReportDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        business_day = await self._business_day_repo.get_by_business_date(
            input.store_id,
            local_business_date(store.timezone),
        )
        if business_day is None:
            raise NotFoundError("Jornada no encontrada")
        return _validated_report(business_day)


class GetCloseReportUseCase:
    def __init__(self, business_day_repo: IStoreBusinessDayRepository):
        self._business_day_repo = business_day_repo

    async def execute(self, input: GetCloseReportInput) -> StoreDayCloseReportDTO:
        business_day = await self._business_day_repo.get_by_id(input.store_id, input.business_day_id)
        if business_day is None:
            raise NotFoundError("Jornada no encontrada")
        return _validated_report(business_day)


def _validated_report(business_day) -> StoreDayCloseReportDTO:
    if business_day.status == "open":
        raise ConflictError("La jornada aun esta abierta")
    if business_day.closing_snapshot_at is None:
        raise ConflictError("El cierre aun no tiene snapshot disponible")
    return close_report_from_business_day(business_day)
