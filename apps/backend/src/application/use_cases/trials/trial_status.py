from dataclasses import dataclass
from uuid import UUID

from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class BillingStatusResult:
    subscription_status: str
    access_status: str
    trial_expires_at: str | None
    days_until_trial_ends: int | None
    next_billing_date: str | None
    days_until_next_billing: int | None
    grace_days_remaining: int | None
    is_trial: bool
    is_expired: bool
    should_warn: bool


class BillingStatusUseCase:
    def __init__(self, store_repo: IStoreRepository):
        self._store_repo = store_repo

    async def execute(self, store_id: UUID) -> BillingStatusResult:
        store = await self._store_repo.get_by_id(store_id)
        if store is None:
            return BillingStatusResult(
                subscription_status="trial",
                access_status="active",
                trial_expires_at=None,
                days_until_trial_ends=None,
                next_billing_date=None,
                days_until_next_billing=None,
                grace_days_remaining=None,
                is_trial=False,
                is_expired=False,
                should_warn=False,
            )
        return BillingStatusResult(
            subscription_status=store.subscription_status,
            access_status=store.access_status,
            trial_expires_at=store.trial_expires_at.isoformat() if store.trial_expires_at else None,
            days_until_trial_ends=store.days_until_trial_ends,
            next_billing_date=store.next_billing_date.isoformat() if store.next_billing_date else None,
            days_until_next_billing=store.days_until_next_billing,
            grace_days_remaining=store.grace_days_remaining,
            is_trial=store.subscription_status == "trial",
            is_expired=store.subscription_status == "expired",
            should_warn=store.should_warn_trial_ending,
        )
