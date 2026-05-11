from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from src.infrastructure.database.models.product_model import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    store_id = Column(UUID(as_uuid=True))
    full_name = Column(String(100))
    role = Column(String(20), default="cashier")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
