import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class BillingAuditLogModel(Base):
    __tablename__ = "billing_audit_log"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    changed_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    changed_by_email = Column(String(255), nullable=False)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    reason = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
