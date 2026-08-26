from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.billing_audit_log import BillingAuditLogEntry
from src.domain.repositories.billing_audit_log_repository import (
    IBillingAuditLogRepository,
)


@dataclass
class ListBillingHistoryInput:
    store_id: UUID
    limit: int = 20
    offset: int = 0


class ListBillingHistoryUseCase:
    def __init__(self, audit_repo: IBillingAuditLogRepository):
        self._audit_repo = audit_repo

    async def execute(self, data: ListBillingHistoryInput) -> list[BillingAuditLogEntry]:
        return await self._audit_repo.list_by_store(data.store_id, limit=data.limit, offset=data.offset)
