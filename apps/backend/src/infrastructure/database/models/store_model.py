import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Numeric, String

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
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    subscription_status = Column(String(20), nullable=False, default="trial")
    next_billing_date = Column(DateTime(timezone=True), nullable=True)
    grace_period_started_at = Column(DateTime(timezone=True), nullable=True)
    subscription_started_at = Column(DateTime(timezone=True), nullable=True)
    billing_email = Column(String(255), nullable=True)
    billing_nit = Column(String(50), nullable=True)
    billing_razon_social = Column(String(255), nullable=True)
    allow_percentage_discount = Column(Boolean, nullable=False, default=False)
    max_percentage_discount = Column(Numeric(5, 2), nullable=False, default=0)
    allow_manual_discount = Column(Boolean, nullable=False, default=False)
    max_manual_discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    allow_cashier_discount_override = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
