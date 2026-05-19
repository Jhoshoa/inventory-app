from dataclasses import dataclass
from uuid import UUID

from src.application.dto.sync_dto import SyncChangeDTO, SyncChangeResultDTO
from src.domain.repositories.sync_repository import ISyncRepository


@dataclass
class SyncPushInput:
    store_id: UUID
    device_id: str
    changes: list[SyncChangeDTO]


class SyncPushUseCase:
    def __init__(self, repo: ISyncRepository):
        self._repo = repo

    async def execute(self, input: SyncPushInput) -> list[SyncChangeResultDTO]:
        return await self._repo.push_changes(input.store_id, input.device_id, input.changes)
