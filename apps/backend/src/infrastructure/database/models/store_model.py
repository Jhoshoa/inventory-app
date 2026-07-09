import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, String

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class StoreModel(Base):
    __tablename__ = "stores"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    timezone = Column(String(64), nullable=False, default="America/La_Paz")
    first_business_date = Column(Date)
    trial_expires_at = Column(DateTime(timezone=True), nullable=True)
    access_status = Column(String(20), nullable=False, default="active")
    subscription_status = Column(String(20), nullable=False, default="trial")
    next_billing_date = Column(DateTime(timezone=True), nullable=True)
    grace_period_started_at = Column(DateTime(timezone=True), nullable=True)
    subscription_started_at = Column(DateTime(timezone=True), nullable=True)
    billing_email = Column(String(255), nullable=True)
    billing_nit = Column(String(50), nullable=True)
    billing_razon_social = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
