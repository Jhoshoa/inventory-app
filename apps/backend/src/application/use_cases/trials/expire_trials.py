from datetime import datetime, timezone

from src.domain.repositories.store_repository import IStoreRepository


class ExpireTrialsUseCase:
    """Suspende tiendas cuyo trial expiro.

    Solo cambia store.access_status = 'suspended' (y subscription_status = 'expired').
    No toca user.is_active — el bloqueo se maneja desde el store check en cada request.

    Se ejecuta una vez al dia via cron (8:00 AM UTC).
    """

    def __init__(self, store_repo: IStoreRepository):
        self._store_repo = store_repo

    async def execute(self) -> int:
        now = datetime.now(timezone.utc)
        expired_stores = await self._store_repo.list_by_expired_trial(now)
        if not expired_stores:
            return 0

        store_ids = [store.id for store in expired_stores]
        await self._store_repo.batch_update_expired(store_ids, "suspended", "expired")
        return len(store_ids)
