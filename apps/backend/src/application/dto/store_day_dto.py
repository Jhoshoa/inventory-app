from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class StoreDayActionDTO(BaseModel):
    opening_note: str | None = Field(default=None, max_length=255)
    closing_note: str | None = Field(default=None, max_length=255)
    opening_cash_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    counted_cash_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


class StoreDayCloseActionDTO(BaseModel):
    closing_note: str | None = Field(default=None, max_length=255)
    counted_cash_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    skip_cash_count: bool = False

    @model_validator(mode="after")
    def validate_cash_count_intent(self) -> "StoreDayCloseActionDTO":
        if self.skip_cash_count:
            if self.counted_cash_amount is not None:
                raise ValueError("No envie efectivo contado cuando cierre sin conteo")
            return self
        if self.counted_cash_amount is None:
            raise ValueError("Efectivo contado es requerido o marque cierre sin conteo")
        return self


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
    opening_cash_amount: Decimal | None = None
    expected_cash_amount: Decimal | None = None
    counted_cash_amount: Decimal | None = None
    cash_difference_amount: Decimal | None = None
    closing_sales_total: Decimal | None = None
    closing_sales_count: int | None = None
    closing_voided_sales_count: int | None = None
    closing_items_count: int | None = None
    closing_cash_sales_total: Decimal | None = None
    closing_qr_sales_total: Decimal | None = None
    closing_transfer_sales_total: Decimal | None = None
    closing_card_sales_total: Decimal | None = None
    closing_cash_movements_in_total: Decimal | None = None
    closing_cash_movements_out_total: Decimal | None = None
    closing_cash_movements_count: int | None = None
    closing_snapshot_at: datetime | None = None
    sales_total: Decimal | None = None
    sales_count: int | None = None
    voided_sales_count: int | None = None
    timezone: str
    first_business_date: date | None = None

    model_config = {"from_attributes": True}


class StoreDayEventResponseDTO(BaseModel):
    id: UUID
    business_day_id: UUID
    store_id: UUID
    event_type: str
    note: str | None = None
    created_by_user_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class StoreDayClosingPreviewDTO(BaseModel):
    business_day_id: UUID
    business_date: date
    status: str
    opening_cash_amount: Decimal
    sales_total: Decimal
    sales_count: int
    voided_sales_count: int
    items_count: int
    cash_sales_total: Decimal
    qr_sales_total: Decimal
    transfer_sales_total: Decimal
    card_sales_total: Decimal
    cash_movements_in_total: Decimal = Decimal("0")
    cash_movements_out_total: Decimal = Decimal("0")
    cash_movements_count: int = 0
    expected_cash_amount: Decimal


class StoreDayCloseReportDTO(StoreDayClosingPreviewDTO):
    closed_at: datetime
    closed_by_user_id: UUID
    counted_cash_amount: Decimal | None = None
    cash_difference_amount: Decimal | None = None
    closing_note: str | None = None
    closing_snapshot_at: datetime


class StoreDayCloseReportListDTO(BaseModel):
    items: list[StoreDayCloseReportDTO]
    total: int
    limit: int
    offset: int
    from_date: date
    to_date: date
