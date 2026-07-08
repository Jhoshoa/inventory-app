import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase

from src.infrastructure.database.types import GUID


class Base(DeclarativeBase):
    pass


class ProductModel(Base):
    __tablename__ = "products"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    name = Column(String(100), nullable=False)
    category_id = Column(GUID(), ForeignKey("product_categories.id"))
    category = Column(String(50))
    sku = Column(String(50))
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2))
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=1)
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
        Index("ix_products_store_id_id", "store_id", "id"),
        Index("ix_products_store_name", "store_id", "name"),
        Index("ix_products_store_category_id", "store_id", "category_id"),
        Index("ix_products_store_category", "store_id", "category"),
        Index("ix_products_store_sku", "store_id", "sku"),
        Index("ix_products_store_qr_code", "store_id", "qr_code"),
        Index("ix_products_store_stock", "store_id", "stock"),
        Index("ix_products_updated_at", "updated_at"),
        UniqueConstraint("store_id", "sku", name="uq_products_store_sku"),
        UniqueConstraint("store_id", "name", "unit", name="uq_products_store_name_unit"),
    )
