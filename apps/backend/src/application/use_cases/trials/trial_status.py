from dataclasses import dataclass
from uuid import UUID

from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class TrialStatusResult:
    is_trial: bool
    expires_at: str | None
    days_remaining: int | None
    is_expired: bool
    should_warn: bool


class TrialStatusUseCase:
    def __init__(self, store_repo: IStoreRepository):
        self._store_repo = store_repo

    async def execute(self, store_id: UUID) -> TrialStatusResult:
        store = await self._store_repo.get_by_id(store_id)
        if store is None or store.trial_expires_at is None:
            return TrialStatusResult(
                is_trial=False,
                expires_at=None,
                days_remaining=None,
                is_expired=False,
                should_warn=False,
            )
        return TrialStatusResult(
            is_trial=True,
            expires_at=store.trial_expires_at.isoformat(),
            days_remaining=store.days_until_trial_ends,
            is_expired=not store.is_trial_active,
            should_warn=store.should_warn_trial_ending,
        )
