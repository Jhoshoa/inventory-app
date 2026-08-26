from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.billing_audit_log import BillingAuditLogEntry
from src.domain.repositories.billing_audit_log_repository import (
    IBillingAuditLogRepository,
)
from src.infrastructure.database.models.billing_audit_log_model import (
    BillingAuditLogModel,
)


class BillingAuditLogRepository(IBillingAuditLogRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, entry: BillingAuditLogEntry) -> BillingAuditLogEntry:
        model = BillingAuditLogModel(
            id=entry.id,
            store_id=entry.store_id,
            changed_by=entry.changed_by,
            changed_by_email=entry.changed_by_email,
            old_values=entry.old_values,
            new_values=entry.new_values,
            reason=entry.reason,
            created_at=entry.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return entry

    async def list_by_store(
        self, store_id: UUID, *, limit: int = 20, offset: int = 0
    ) -> list[BillingAuditLogEntry]:
        stmt = (
            select(BillingAuditLogModel)
            .where(BillingAuditLogModel.store_id == store_id)
            .order_by(BillingAuditLogModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(row) for row in result.scalars()]

    @staticmethod
    def _to_entity(model: BillingAuditLogModel) -> BillingAuditLogEntry:
        return BillingAuditLogEntry(
            id=model.id,
            store_id=model.store_id,
            changed_by=model.changed_by,
            changed_by_email=model.changed_by_email,
            reason=model.reason,
            old_values=model.old_values or {},
            new_values=model.new_values or {},
            created_at=model.created_at,
        )
