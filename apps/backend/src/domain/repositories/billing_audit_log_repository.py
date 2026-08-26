from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.billing_audit_log import BillingAuditLogEntry


class IBillingAuditLogRepository(ABC):
    @abstractmethod
    async def save(self, entry: BillingAuditLogEntry) -> BillingAuditLogEntry: ...

    @abstractmethod
    async def list_by_store(
        self, store_id: UUID, *, limit: int = 20, offset: int = 0
    ) -> list[BillingAuditLogEntry]: ...
