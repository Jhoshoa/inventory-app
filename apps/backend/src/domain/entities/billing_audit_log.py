from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4

SYSTEM_ACTOR_EMAIL = "system@scheduler"


@dataclass
class BillingAuditLogEntry:
    id: UUID
    store_id: UUID
    changed_by: UUID | None
    changed_by_email: str
    reason: str
    old_values: dict = field(default_factory=dict)
    new_values: dict = field(default_factory=dict)
    created_at: datetime | None = None

    @staticmethod
    def create(
        *,
        store_id: UUID,
        reason: str,
        changed_by: UUID | None = None,
        changed_by_email: str = SYSTEM_ACTOR_EMAIL,
        old_values: dict | None = None,
        new_values: dict | None = None,
    ) -> "BillingAuditLogEntry":
        return BillingAuditLogEntry(
            id=uuid4(),
            store_id=store_id,
            changed_by=changed_by,
            changed_by_email=changed_by_email,
            reason=reason,
            old_values=old_values or {},
            new_values=new_values or {},
            created_at=datetime.now(UTC),
        )
