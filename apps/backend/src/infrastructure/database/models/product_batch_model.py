import uuid
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Index, Integer, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class ProductBatchModel(Base):
    """Lote de un producto con fecha de vencimiento.

    El stock del producto sigue siendo la fuente de verdad: la suma de
    quantity_remaining de sus lotes nunca supera products.stock, y la
    diferencia es stock "sin lote" (sin fecha de vencimiento conocida).
    """

    __tablename__ = "product_batches"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    product_id = Column(GUID(), ForeignKey("products.id"), nullable=False)
    expires_on = Column(Date, nullable=False)
    alert_days = Column(Integer, nullable=False, default=5)
    # expires_on - alert_days: desde ese dia el lote sale en "Por vencer".
    alert_on = Column(Date, nullable=False)
    quantity_initial = Column(Integer, nullable=False)
    quantity_remaining = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("quantity_remaining >= 0", name="ck_product_batches_remaining_non_negative"),
        CheckConstraint("quantity_remaining <= quantity_initial", name="ck_product_batches_remaining_le_initial"),
        CheckConstraint("alert_days >= 0", name="ck_product_batches_alert_days_non_negative"),
        Index("ix_product_batches_store_product", "store_id", "product_id"),
        Index("ix_product_batches_store_alert_on", "store_id", "alert_on"),
    )


class BatchConsumptionModel(Base):
    """Cuanto se saco (positivo) o se devolvio (negativo) de un lote.

    Permite que anular una venta devuelva las unidades a los mismos lotes.
    """

    __tablename__ = "batch_consumptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    batch_id = Column(GUID(), ForeignKey("product_batches.id"), nullable=False)
    product_id = Column(GUID(), ForeignKey("products.id"), nullable=False)
    sale_id = Column(GUID(), ForeignKey("sales.id"))
    stock_movement_id = Column(GUID(), ForeignKey("stock_movements.id"))
    quantity = Column(Integer, nullable=False)
    reason = Column(String(40), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    __table_args__ = (
        Index("ix_batch_consumptions_batch_id", "batch_id"),
        Index("ix_batch_consumptions_sale_product", "sale_id", "product_id"),
    )
