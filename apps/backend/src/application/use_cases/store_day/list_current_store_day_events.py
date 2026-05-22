from dataclasses import dataclass
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayEventResponseDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.store_day._business_date import local_business_date
from src.domain.repositories.store_business_day_event_repository import IStoreBusinessDayEventRepository
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class ListCurrentStoreDayEventsInput:
    store_id: UUID


class ListCurrentStoreDayEventsUseCase:
    def __init__(
        self,
        store_repo: IStoreRepository,
        business_day_repo: IStoreBusinessDayRepository,
        event_repo: IStoreBusinessDayEventRepository,
    ):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo
        self._event_repo = event_repo

    async def execute(self, input: ListCurrentStoreDayEventsInput) -> list[StoreDayEventResponseDTO]:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            business_day = await self._business_day_repo.get_by_business_date(
                input.store_id,
                local_business_date(store.timezone),
            )
        if business_day is None:
            return []

        events = await self._event_repo.list_by_business_day(input.store_id, business_day.id)
        return [
            StoreDayEventResponseDTO(
                id=event.id,
                business_day_id=event.business_day_id,
                store_id=event.store_id,
                event_type=event.event_type,
                note=event.note,
                created_by_user_id=event.created_by_user_id,
                created_at=event.created_at,
            )
            for event in events
        ]
