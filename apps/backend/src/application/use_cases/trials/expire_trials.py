from datetime import UTC, datetime

from src.domain.entities.billing_audit_log import BillingAuditLogEntry
from src.domain.repositories.billing_audit_log_repository import (
    IBillingAuditLogRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


class ExpireTrialsUseCase:
    """Suspende tiendas cuyo trial expiro.

    Solo cambia store.access_status = 'suspended' (y subscription_status = 'expired').
    No toca user.is_active — el bloqueo se maneja desde el store check en cada request.

    Se ejecuta una vez al dia via cron (8:00 AM UTC).
    """

    def __init__(
        self,
        store_repo: IStoreRepository,
        audit_repo: IBillingAuditLogRepository | None = None,
    ):
        self._store_repo = store_repo
        self._audit_repo = audit_repo

    async def execute(self) -> int:
        now = datetime.now(UTC)
        expired_stores = await self._store_repo.list_by_expired_trial(now)
        if not expired_stores:
            return 0

        store_ids = [store.id for store in expired_stores]
        await self._store_repo.batch_update_expired(store_ids, "suspended", "expired")

        if self._audit_repo is not None:
            for store in expired_stores:
                await self._audit_repo.save(
                    BillingAuditLogEntry.create(
                        store_id=store.id,
                        reason="trial_expired",
                        old_values={"subscription_status": store.subscription_status, "access_status": store.access_status},
                        new_values={"subscription_status": "expired", "access_status": "suspended"},
                    )
                )

        return len(store_ids)
