import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Numeric, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class CashMovementModel(Base):
    __tablename__ = "cash_movements"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    business_day_id = Column(GUID(), ForeignKey("store_business_days.id"), nullable=False)
    movement_type = Column(String(30), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    note = Column(String(255))
    created_by_user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    voided_at = Column(DateTime(timezone=True))
    voided_by_user_id = Column(GUID(), ForeignKey("users.id"))
    void_reason = Column(String(255))

    __table_args__ = (
        Index("ix_cash_movements_store_day_occurred", "store_id", "business_day_id", "occurred_at"),
        Index("ix_cash_movements_store_occurred", "store_id", "occurred_at"),
        Index("ix_cash_movements_store_type_occurred", "store_id", "movement_type", "occurred_at"),
        Index("ix_cash_movements_business_day_occurred", "business_day_id", "occurred_at"),
    )
