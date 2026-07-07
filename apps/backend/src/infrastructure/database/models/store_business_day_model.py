import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StoreBusinessDayModel(Base):
    __tablename__ = "store_business_days"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    business_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True))
    opened_by_user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    closed_by_user_id = Column(GUID(), ForeignKey("users.id"))
    opening_note = Column(String(255))
    closing_note = Column(String(255))
    opening_cash_amount = Column(Numeric(12, 2))
    expected_cash_amount = Column(Numeric(12, 2))
    counted_cash_amount = Column(Numeric(12, 2))
    cash_difference_amount = Column(Numeric(12, 2))
    closing_sales_total = Column(Numeric(12, 2))
    closing_sales_count = Column(Integer)
    closing_voided_sales_count = Column(Integer)
    closing_items_count = Column(Integer)
    closing_cash_sales_total = Column(Numeric(12, 2))
    closing_qr_sales_total = Column(Numeric(12, 2))
    closing_transfer_sales_total = Column(Numeric(12, 2))
    closing_card_sales_total = Column(Numeric(12, 2))
    closing_cash_movements_in_total = Column(Numeric(12, 2))
    closing_cash_movements_out_total = Column(Numeric(12, 2))
    closing_cash_movements_count = Column(Integer)
    closing_snapshot_at = Column(DateTime(timezone=True))
    sales_total = Column(Numeric(12, 2))
    sales_count = Column(Integer)
    voided_sales_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("store_id", "business_date", name="uq_store_business_days_store_date"),
        Index("ix_store_business_days_store_status", "store_id", "status"),
        Index("ix_store_business_days_store_date", "store_id", "business_date"),
        Index("ix_store_business_days_store_opened_closed", "store_id", "opened_at", "closed_at"),
    )
