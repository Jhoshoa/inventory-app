import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StoreLocationModel(Base):
    """Lugar fisico de la tienda: Zona -> Mueble/Estante -> Nivel."""

    __tablename__ = "store_locations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    zone = Column(String(50), nullable=False)
    shelf = Column(String(50))
    level = Column(String(30))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (Index("ix_store_locations_store_id", "store_id"),)


class ProductLocationModel(Base):
    """Donde se encuentra un producto: en exhibicion o en deposito."""

    __tablename__ = "product_locations"

    product_id = Column(GUID(), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    location_id = Column(GUID(), ForeignKey("store_locations.id", ondelete="CASCADE"), primary_key=True)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    kind = Column(String(20), nullable=False, default="display")
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    __table_args__ = (
        Index("ix_product_locations_store_product", "store_id", "product_id"),
        Index("ix_product_locations_location_id", "location_id"),
    )
