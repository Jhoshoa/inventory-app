from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class StoreDayActionDTO(BaseModel):
    opening_note: str | None = Field(default=None, max_length=255)
    closing_note: str | None = Field(default=None, max_length=255)


class StoreDayResponseDTO(BaseModel):
    id: UUID | None = None
    status: str
    business_date: date
    opened_at: datetime | None = None
    closed_at: datetime | None = None
    opened_by_user_id: UUID | None = None
    closed_by_user_id: UUID | None = None
    opening_note: str | None = None
    closing_note: str | None = None
    sales_total: Decimal | None = None
    sales_count: int | None = None
    voided_sales_count: int | None = None
    timezone: str
    first_business_date: date | None = None

    model_config = {"from_attributes": True}
