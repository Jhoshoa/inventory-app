from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.application.dto.sync_dto import SyncPullChangeDTO
from src.domain.repositories.sync_repository import ISyncRepository


@dataclass
class SyncPullInput:
    store_id: UUID
    device_id: str
    since: datetime


class SyncPullUseCase:
    def __init__(self, repo: ISyncRepository):
        self._repo = repo

    async def execute(self, input: SyncPullInput) -> list[SyncPullChangeDTO]:
        return await self._repo.get_updates_since(input.store_id, input.since)
