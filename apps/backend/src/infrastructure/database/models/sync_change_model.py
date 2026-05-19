import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class SyncChangeModel(Base):
    __tablename__ = "sync_changes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    device_id = Column(String(100), nullable=False)
    client_change_id = Column(String(120), nullable=False)
    entity = Column(String(40), nullable=False)
    operation = Column(String(40), nullable=False)
    entity_id = Column(GUID(), nullable=False)
    status = Column(String(30), nullable=False)
    error_code = Column(String(60))
    error_detail = Column(Text)
    server_version = Column(Integer)
    server_updated_at = Column(DateTime(timezone=True))
    client_created_at = Column(DateTime(timezone=True), nullable=False)
    processed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "device_id", "client_change_id", name="uq_sync_changes_store_device_change"),
        Index("ix_sync_changes_store_device", "store_id", "device_id"),
        Index("ix_sync_changes_store_processed_at", "store_id", "processed_at"),
        Index("ix_sync_changes_entity", "entity"),
    )
