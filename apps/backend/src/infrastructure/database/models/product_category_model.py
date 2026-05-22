import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class ProductCategoryModel(Base):
    __tablename__ = "product_categories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    name = Column(String(80), nullable=False)
    sku_prefix = Column(String(8), nullable=False)
    next_sku_number = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("store_id", "name", name="uq_product_categories_store_name"),
        UniqueConstraint("store_id", "sku_prefix", name="uq_product_categories_store_sku_prefix"),
        Index("ix_product_categories_store_active_name", "store_id", "is_active", "name"),
    )
