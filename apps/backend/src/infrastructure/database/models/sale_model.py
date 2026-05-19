import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class SaleModel(Base):
    __tablename__ = "sales"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    device_id = Column(String(100))
    customer_name = Column(String(100))
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False)
    items_count = Column(Integer, nullable=False, default=0)
    payment_method = Column(String(20), default="efectivo")
    status = Column(String(20), default="completed")
    voided_at = Column(DateTime(timezone=True))
    void_reason = Column(String(200))
    synced = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("SaleItemModel", back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sales_store_id", "store_id"),
        Index("ix_sales_store_id_id", "store_id", "id"),
        Index("ix_sales_store_status_created_at", "store_id", "status", "created_at"),
        Index("ix_sales_created_at", "created_at"),
    )


class SaleItemModel(Base):
    __tablename__ = "sale_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    sale_id = Column(GUID(), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(GUID(), ForeignKey("products.id"), nullable=False)
    product_name = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    sale = relationship("SaleModel", back_populates="items")

    __table_args__ = (Index("ix_sale_items_product_id", "product_id"),)
