from dataclasses import dataclass
from uuid import UUID
from src.domain.repositories.sync_repository import ISyncRepository


@dataclass
class SyncPushInput:
    store_id: UUID
    changes: list[dict]


class SyncPushUseCase:
    def __init__(self, repo: ISyncRepository):
        self._repo = repo

    async def execute(self, input: SyncPushInput) -> None:
        await self._repo.push_changes(input.store_id, input.changes)
