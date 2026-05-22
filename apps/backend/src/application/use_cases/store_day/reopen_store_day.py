from dataclasses import dataclass
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayResponseDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.store_day._business_date import local_business_date
from src.application.use_cases.store_day.get_current_store_day import _to_response
from src.domain.entities.store_business_day_event import StoreBusinessDayEvent
from src.domain.repositories.store_business_day_event_repository import IStoreBusinessDayEventRepository
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class ReopenStoreDayInput:
    store_id: UUID
    opened_by_user_id: UUID
    opening_note: str | None = None


class ReopenStoreDayUseCase:
    def __init__(
        self,
        store_repo: IStoreRepository,
        business_day_repo: IStoreBusinessDayRepository,
        event_repo: IStoreBusinessDayEventRepository,
    ):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo
        self._event_repo = event_repo

    async def execute(self, input: ReopenStoreDayInput) -> StoreDayResponseDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        if await self._business_day_repo.get_open_by_store(input.store_id):
            raise ConflictError("La tienda ya tiene una jornada abierta")

        business_date = local_business_date(store.timezone)
        business_day = await self._business_day_repo.get_by_business_date(input.store_id, business_date)
        if business_day is None:
            raise ConflictError("No hay una jornada cerrada de hoy para reabrir")
        if business_day.status != "closed":
            raise ConflictError("Solo se puede reabrir una jornada cerrada")

        business_day.reopen(opened_by_user_id=input.opened_by_user_id, opening_note=input.opening_note)
        reopened = await self._business_day_repo.reopen(business_day)
        await self._event_repo.save(
            StoreBusinessDayEvent.create(
                business_day_id=reopened.id,
                store_id=reopened.store_id,
                event_type="reopen",
                created_by_user_id=input.opened_by_user_id,
                note=input.opening_note,
            )
        )
        return _to_response(reopened, timezone=store.timezone, first_business_date=store.first_business_date)
