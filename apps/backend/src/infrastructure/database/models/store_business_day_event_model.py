import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StoreBusinessDayEventModel(Base):
    __tablename__ = "store_business_day_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    business_day_id = Column(GUID(), ForeignKey("store_business_days.id"), nullable=False)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    event_type = Column(String(20), nullable=False)
    note = Column(String(255))
    created_by_user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_store_business_day_events_day_created", "business_day_id", "created_at"),
        Index("ix_store_business_day_events_store_created", "store_id", "created_at"),
        Index("ix_store_business_day_events_day_type_created", "business_day_id", "event_type", "created_at"),
    )
