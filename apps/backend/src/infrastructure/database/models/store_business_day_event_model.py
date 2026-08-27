import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StoreBusinessDayEventModel(Base):
    __tablename__ = "store_business_day_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    business_day_id = Column(GUID(), ForeignKey("store_business_days.id"), nullable=False)
    store_id = Column(GUID(), ForeignKey("stores.id"), nullable=False)
    event_type = Column(String(20), nullable=False)
    note = Column(String(255))
    created_by_user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    # Desempate explicito de orden dentro de una jornada. `created_at` no
    # alcanza: en Windows `datetime.now()` puede devolver el mismo valor en
    # llamadas sucesivas muy rapidas (resolucion de reloj ~15ms), y el id
    # (UUID aleatorio) no tiene relacion con el orden de insercion. Se
    # calcula en el repositorio como MAX(sequence)+1 por business_day_id.
    sequence = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("ix_store_business_day_events_day_created", "business_day_id", "created_at"),
        Index("ix_store_business_day_events_store_created", "store_id", "created_at"),
        Index("ix_store_business_day_events_day_type_created", "business_day_id", "event_type", "created_at"),
    )
