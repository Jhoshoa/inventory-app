from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.billing_audit_log import BillingAuditLogEntry
from src.domain.repositories.billing_audit_log_repository import (
    IBillingAuditLogRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class AdminUpdateBillingInput:
    store_id: UUID
    admin_id: UUID
    admin_email: str
    reason: str
    subscription_status: str | None = None
    next_billing_date: datetime | None = None
    billing_email: str | None = None
    billing_nit: str | None = None
    billing_razon_social: str | None = None


class AdminUpdateBillingUseCase:
    """Actualiza manualmente el estado de facturacion de una tienda.

    Reservado para platform_admin (ver require_platform_admin). Mantiene
    access_status sincronizado con subscription_status y deja rastro en
    billing_audit_log de cada cambio, incluyendo quien lo hizo y por que.
    """

    def __init__(
        self,
        store_repo: IStoreRepository,
        audit_repo: IBillingAuditLogRepository,
    ):
        self._store_repo = store_repo
        self._audit_repo = audit_repo

    async def execute(self, data: AdminUpdateBillingInput) -> None:
        store = await self._store_repo.get_by_id(data.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        old_values = {
            "subscription_status": store.subscription_status,
            "access_status": store.access_status,
            "next_billing_date": store.next_billing_date.isoformat() if store.next_billing_date else None,
        }

        clear_grace_period = False
        grace_period_started_at = None
        if data.subscription_status == "past_due":
            grace_period_started_at = datetime.now(UTC)
        elif data.subscription_status == "active":
            clear_grace_period = True

        await self._store_repo.update_subscription(
            data.store_id,
            subscription_status=data.subscription_status,
            next_billing_date=data.next_billing_date,
            grace_period_started_at=grace_period_started_at,
            clear_grace_period=clear_grace_period,
            billing_email=data.billing_email,
            billing_nit=data.billing_nit,
            billing_razon_social=data.billing_razon_social,
        )

        if data.subscription_status == "active":
            await self._store_repo.update_access_status(data.store_id, "active")
        elif data.subscription_status == "expired":
            await self._store_repo.update_access_status(data.store_id, "suspended")

        new_values = {
            "subscription_status": data.subscription_status or store.subscription_status,
            "next_billing_date": data.next_billing_date.isoformat() if data.next_billing_date else None,
        }

        entry = BillingAuditLogEntry.create(
            store_id=data.store_id,
            changed_by=data.admin_id,
            changed_by_email=data.admin_email,
            reason=data.reason,
            old_values=old_values,
            new_values=new_values,
        )
        await self._audit_repo.save(entry)
