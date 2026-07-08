import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class ImportJobModel(Base):
    __tablename__ = "import_jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="validating")
    total_rows = Column(Integer, nullable=False, default=0)
    imported_count = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    errors = Column(JSON, nullable=False, default=list)
    filename = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_import_jobs_store_completed", "store_id", "created_at"),
    )
