from datetime import UTC, datetime, timedelta

from src.config.settings import settings
from src.domain.entities.billing_audit_log import BillingAuditLogEntry
from src.domain.repositories.billing_audit_log_repository import (
    IBillingAuditLogRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


class ArchiveStoresUseCase:
    """Archiva tiendas suspendidas de larga data.

    No borra ningun dato: solo cambia `access_status` a 'archived' para
    ocultar la tienda de listados operativos (p. ej. paneles de admin). La
    purga definitiva de datos es una accion manual separada, fuera de
    alcance de este use case, dado el riesgo de perder datos de un cliente
    que solo se atraso en el pago.

    Se ejecuta una vez al dia via cron (mismo horario que expire_trials /
    process_grace_period).
    """

    def __init__(
        self,
        store_repo: IStoreRepository,
        audit_repo: IBillingAuditLogRepository | None = None,
    ):
        self._store_repo = store_repo
        self._audit_repo = audit_repo

    async def execute(self) -> int:
        cutoff = datetime.now(UTC) - timedelta(days=settings.STORE_ARCHIVE_AFTER_SUSPENDED_DAYS)
        stores = await self._store_repo.list_by_suspended_before(cutoff)
        if not stores:
            return 0

        store_ids = [store.id for store in stores]
        await self._store_repo.batch_archive(store_ids)

        if self._audit_repo is not None:
            for store in stores:
                await self._audit_repo.save(
                    BillingAuditLogEntry.create(
                        store_id=store.id,
                        reason="suspended_store_archived",
                        old_values={"access_status": store.access_status},
                        new_values={"access_status": "archived"},
                    )
                )

        return len(store_ids)
