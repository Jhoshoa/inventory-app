from dataclasses import dataclass
from uuid import UUID
from datetime import datetime
from src.domain.repositories.sync_repository import ISyncRepository


@dataclass
class SyncPullInput:
    store_id: UUID
    since: datetime


class SyncPullUseCase:
    def __init__(self, repo: ISyncRepository):
        self._repo = repo

    async def execute(self, input: SyncPullInput) -> list[dict]:
        return await self._repo.get_updates_since(input.store_id, input.since)
