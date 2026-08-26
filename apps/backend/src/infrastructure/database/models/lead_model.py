import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from src.infrastructure.database.models.product_model import Base
from src.infrastructure.database.types import GUID


class LeadModel(Base):
    __tablename__ = "leads"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=False)
    store_name = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    business_type = Column(String(100), nullable=True)
    message = Column(Text, nullable=True)
    source_page = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
