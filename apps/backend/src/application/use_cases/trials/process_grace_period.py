from datetime import datetime, timedelta, timezone

from src.config.settings import settings
from src.domain.repositories.store_repository import IStoreRepository


class ProcessGracePeriodUseCase:
    """Suspende tiendas en past_due que superaron el periodo de gracia.

    Solo cambia store.access_status = 'suspended' y subscription_status = 'expired'.
    No toca user.is_active.

    Se ejecuta una vez al dia via cron (8:00 AM UTC).
    """

    def __init__(self, store_repo: IStoreRepository):
        self._store_repo = store_repo

    async def execute(self) -> int:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=settings.GRACE_PERIOD_DAYS)
        expired_stores = await self._store_repo.list_by_past_due_expired(cutoff)
        total = 0

        for store in expired_stores:
            await self._store_repo.update_access_status(store.id, "suspended")
            await self._store_repo.update_subscription(
                store.id,
                subscription_status="expired",
            )
            total += 1

        return total
