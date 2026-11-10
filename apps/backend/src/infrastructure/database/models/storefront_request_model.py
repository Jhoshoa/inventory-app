import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StorefrontRequestModel(Base):
    __tablename__ = "storefront_requests"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    product_id = Column(GUID(), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(100), nullable=False)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    payment_confirmed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    total = Column(Numeric(12, 2), nullable=True)
    delivery_method = Column(String(20), nullable=True)

    __table_args__ = (
        Index("ix_storefront_requests_store_status", "store_id", "status"),
        Index("ix_storefront_requests_store_created", "store_id", "created_at"),
    )


class StorefrontRequestItemModel(Base):
    __tablename__ = "storefront_request_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    request_id = Column(GUID(), ForeignKey("storefront_requests.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    product_id = Column(GUID(), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)

    __table_args__ = (Index("ix_storefront_request_items_request", "request_id"),)
