from dataclasses import dataclass
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayClosingPreviewDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.store_day._closing_report import closing_preview_from_summary
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class GetClosingPreviewInput:
    store_id: UUID


class GetClosingPreviewUseCase:
    def __init__(
        self,
        store_repo: IStoreRepository,
        business_day_repo: IStoreBusinessDayRepository,
        sale_repo: ISaleRepository,
    ):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo
        self._sale_repo = sale_repo

    async def execute(self, input: GetClosingPreviewInput) -> StoreDayClosingPreviewDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            raise ConflictError("No hay una jornada abierta para previsualizar cierre")

        summary = await self._sale_repo.sales_closing_summary_for_business_day(input.store_id, business_day.id)
        return closing_preview_from_summary(business_day, summary)
