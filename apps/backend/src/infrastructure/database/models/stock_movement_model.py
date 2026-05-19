import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StockMovementModel(Base):
    __tablename__ = "stock_movements"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    product_id = Column(GUID(), ForeignKey("products.id"), nullable=False)
    sale_id = Column(GUID(), ForeignKey("sales.id"))
    movement_type = Column(String(40), nullable=False)
    quantity_delta = Column(Integer, nullable=False)
    stock_after = Column(Integer, nullable=False)
    reason = Column(String(120))
    device_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_stock_movements_store_id_created_at", "store_id", "created_at"),
        Index("ix_stock_movements_store_product_created_at", "store_id", "product_id", "created_at"),
        Index("ix_stock_movements_product_id", "product_id"),
    )
