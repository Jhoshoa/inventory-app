from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, Numeric, String

from src.infrastructure.database.models.product_model import Base


class ExchangeRateModel(Base):
    __tablename__ = "exchange_rates"

    date = Column(Date, primary_key=True)
    source = Column(String(20), primary_key=True)
    buy_price = Column(Numeric(10, 4), nullable=False)
    sell_price = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
