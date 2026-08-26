from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.billing_audit_log import BillingAuditLogEntry
from src.domain.repositories.billing_audit_log_repository import (
    IBillingAuditLogRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class RequestManualPaymentInput:
    store_id: UUID
    requested_by: UUID
    requested_by_email: str


@dataclass
class RequestManualPaymentResult:
    store_name: str
    billing_email: str | None
    billing_nit: str | None
    billing_razon_social: str | None
    subscription_status: str


class RequestManualPaymentUseCase:
    """Registra en la auditoria que el owner pidio coordinar un pago manual.

    No cobra nada por si solo (todavia no hay pasarela de pago integrada, ver
    docs/mejoras/02-facturacion-real-y-facturacion-electronica-sin.md). El
    frontend usa el resultado para abrir un chat de WhatsApp prellenado con
    los datos de la tienda, y este registro deja trazabilidad de quien pidio
    que se le cobre y cuando.
    """

    def __init__(
        self,
        store_repo: IStoreRepository,
        audit_repo: IBillingAuditLogRepository,
    ):
        self._store_repo = store_repo
        self._audit_repo = audit_repo

    async def execute(self, data: RequestManualPaymentInput) -> RequestManualPaymentResult:
        store = await self._store_repo.get_by_id(data.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        entry = BillingAuditLogEntry.create(
            store_id=store.id,
            changed_by=data.requested_by,
            changed_by_email=data.requested_by_email,
            reason="payment_requested",
            new_values={"subscription_status": store.subscription_status},
        )
        await self._audit_repo.save(entry)

        return RequestManualPaymentResult(
            store_name=store.name,
            billing_email=store.billing_email,
            billing_nit=store.billing_nit,
            billing_razon_social=store.billing_razon_social,
            subscription_status=store.subscription_status,
        )
