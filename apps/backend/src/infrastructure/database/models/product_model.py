import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timezone
from src.infrastructure.database.types import GUID


class Base(DeclarativeBase):
    pass


class ProductModel(Base):
    __tablename__ = "products"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    sku = Column(String(50))
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2))
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=5)
    unit = Column(String(20), default="unidad")
    photo_url = Column(String(500))
    qr_code = Column(String(100), unique=True)
    is_active = Column(Boolean, default=True)
    extra_data = Column("extra_data", JSON, default=dict)
    version = Column(Integer, default=1)
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_products_store_id", "store_id"),
        Index("ix_products_updated_at", "updated_at"),
    )
