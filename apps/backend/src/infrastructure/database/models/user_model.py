from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from datetime import datetime, timezone
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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("ix_users_store_id", "store_id"),)
