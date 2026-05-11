import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from src.infrastructure.database.models.product_model import Base


class SaleModel(Base):
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(20), default="efectivo")
    status = Column(String(20), default="completed")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("SaleItemModel", back_populates="sale", cascade="all, delete-orphan")


class SaleItemModel(Base):
    __tablename__ = "sale_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), nullable=False)
    product_name = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    sale = relationship("SaleModel", back_populates="items")
