from dataclasses import dataclass
from datetime import date
from uuid import UUID

from src.application.dto.sale_dto import SaleListResponseDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.date_ranges import BusinessDateRangeService
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class ListSalesInput:
    store_id: UUID
    from_date: date | None = None
    to_date: date | None = None
    status: str = "all"
    limit: int = 50
    offset: int = 0


class ListSalesUseCase:
    def __init__(
        self,
        repo: ISaleRepository,
        store_repo: IStoreRepository,
        date_ranges: BusinessDateRangeService | None = None,
    ):
        self._repo = repo
        self._store_repo = store_repo
        self._date_ranges = date_ranges or BusinessDateRangeService()

    async def execute(self, input: ListSalesInput) -> SaleListResponseDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        if input.status not in {"all", "completed", "voided"}:
            raise ValueError("Estado de venta invalido")

        if input.from_date is None and input.to_date is None:
            date_range = self._date_ranges.today(
                store.timezone,
                first_business_date=store.first_business_date,
            )
        else:
            from_date = input.from_date or input.to_date
            to_date = input.to_date or input.from_date
            if from_date is None or to_date is None:
                raise ValueError("Rango de fechas invalido")
            date_range = self._date_ranges.custom(
                from_date,
                to_date,
                store.timezone,
                first_business_date=store.first_business_date,
            )

        sales, total = await self._repo.list_by_store(
            input.store_id,
            start_at=date_range.start_at_utc,
            end_at=date_range.end_at_utc,
            status=input.status,
            limit=input.limit,
            offset=input.offset,
        )
        return SaleListResponseDTO(
            items=sales,
            total=total,
            limit=input.limit,
            offset=input.offset,
            from_date=date_range.from_date,
            to_date=date_range.to_date,
            timezone=date_range.timezone,
            first_business_date=store.first_business_date,
        )
