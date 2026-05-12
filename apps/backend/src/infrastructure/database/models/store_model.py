import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime, timezone
from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StoreModel(Base):
    __tablename__ = "stores"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
