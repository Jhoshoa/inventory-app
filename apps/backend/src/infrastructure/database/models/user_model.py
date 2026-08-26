from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class UserModel(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    store_id = Column(GUID(), ForeignKey("stores.id"))
    full_name = Column(String(100))
    role = Column(String(20), default="cashier")
    is_active = Column(Boolean, default=True)
    is_platform_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    last_login_at = Column(DateTime(timezone=True))
    password_hash = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_users_store_id", "store_id"),
        Index("ix_users_store_role", "store_id", "role"),
    )
