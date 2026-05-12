from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class ExchangeRateUpsertDTO(BaseModel):
    date: date
    source: str = Field(..., min_length=1, max_length=20)
    buy_price: Decimal = Field(..., ge=0)
    sell_price: Decimal = Field(..., ge=0)


class ExchangeRateResponseDTO(BaseModel):
    date: date
    source: str
    buy_price: Decimal
    sell_price: Decimal

    model_config = {"from_attributes": True}
