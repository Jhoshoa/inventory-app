from datetime import datetime, timezone

from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_repository import IUserRepository


class ExpireTrialsUseCase:
    """Desactiva todos los usuarios de tiendas cuyo trial_expires_at ya paso.

    Se ejecuta una vez al dia via cron (8:00 AM UTC).
    La guardia principal esta en GetCurrentUserContextUseCase (cada request).
    Este cron solo limpia el flag is_active para consistencia de datos.
    """

    def __init__(self, store_repo: IStoreRepository, user_repo: IUserRepository):
        self._store_repo = store_repo
        self._user_repo = user_repo

    async def execute(self) -> int:
        now = datetime.now(timezone.utc)
        expired_stores = await self._store_repo.list_by_expired_trial(now)
        total_deactivated = 0

        for store in expired_stores:
            active_users = await self._user_repo.list_active_by_store(store.id)
            for user in active_users:
                user.is_active = False
                await self._user_repo.save(user)
                total_deactivated += 1

        return total_deactivated
