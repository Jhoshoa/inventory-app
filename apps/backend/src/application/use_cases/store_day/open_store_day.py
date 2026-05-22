from dataclasses import dataclass
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayResponseDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.store_day._business_date import local_business_date
from src.application.use_cases.store_day.get_current_store_day import _to_response
from src.domain.entities.store_business_day import StoreBusinessDay
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class OpenStoreDayInput:
    store_id: UUID
    opened_by_user_id: UUID
    opening_note: str | None = None


class OpenStoreDayUseCase:
    def __init__(self, store_repo: IStoreRepository, business_day_repo: IStoreBusinessDayRepository):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo

    async def execute(self, input: OpenStoreDayInput) -> StoreDayResponseDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        if await self._business_day_repo.get_open_by_store(input.store_id):
            raise ConflictError("La tienda ya tiene una jornada abierta")

        business_date = local_business_date(store.timezone)
        existing_for_date = await self._business_day_repo.get_by_business_date(input.store_id, business_date)
        if existing_for_date:
            raise ConflictError("La jornada de hoy ya fue cerrada y no se puede reabrir en esta version")

        business_day = StoreBusinessDay.open(
            store_id=input.store_id,
            business_date=business_date,
            opened_by_user_id=input.opened_by_user_id,
            opening_note=input.opening_note,
        )
        saved = await self._business_day_repo.save(business_day)
        first_business_date = store.first_business_date
        if first_business_date is None:
            await self._store_repo.set_first_business_date(store.id, business_date)
            first_business_date = business_date

        return _to_response(saved, timezone=store.timezone, first_business_date=first_business_date)
