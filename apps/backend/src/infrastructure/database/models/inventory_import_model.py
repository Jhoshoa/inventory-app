import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import relationship

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class InventoryImportModel(Base):
    __tablename__ = "inventory_imports"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    status = Column(String(30), nullable=False)
    source_filename = Column(String(255))
    source_content_type = Column(String(100))
    source_photo_url = Column(String(500))
    raw_text = Column(Text)
    error_message = Column(Text)
    items_count = Column(Integer, nullable=False, default=0)
    created_by = Column(GUID())
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    confirmed_at = Column(DateTime(timezone=True))

    items = relationship("InventoryImportItemModel", back_populates="inventory_import", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_inventory_imports_store_created_at", "store_id", "created_at"),
        Index("ix_inventory_imports_store_status", "store_id", "status"),
    )


class InventoryImportItemModel(Base):
    __tablename__ = "inventory_import_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    import_id = Column(GUID(), ForeignKey("inventory_imports.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    status = Column(String(30), nullable=False)
    row_number = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    sku = Column(String(50))
    unit = Column(String(20), nullable=False, default="unidad")
    price = Column(Numeric(10, 2), nullable=False, default=0)
    cost_price = Column(Numeric(10, 2))
    stock = Column(Integer, nullable=False, default=0)
    min_stock = Column(Integer, nullable=False, default=5)
    confidence = Column(Numeric(5, 4))
    raw_data = Column(JSON, nullable=False, default=dict)
    product_id = Column(GUID(), ForeignKey("products.id"))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inventory_import = relationship("InventoryImportModel", back_populates="items")

    __table_args__ = (
        Index("ix_inventory_import_items_store_import", "store_id", "import_id"),
        Index("ix_inventory_import_items_import_status", "import_id", "status"),
        Index("ix_inventory_import_items_store_name", "store_id", "name"),
    )
