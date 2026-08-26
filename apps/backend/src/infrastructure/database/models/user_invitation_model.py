from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class UserInvitationModel(Base):
    __tablename__ = "user_invitations"

    id = Column(GUID(), primary_key=True)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="cashier")
    token_hash = Column(String(255), nullable=False, unique=True)
    status = Column(String(20), nullable=False, default="pending")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    invited_by_user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    accepted_by_user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    send_count = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("ix_user_invitations_store_status", "store_id", "status"),
        Index("ix_user_invitations_email", "email"),
        Index("ix_user_invitations_expires_at", "expires_at"),
    )
