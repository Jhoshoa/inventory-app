from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class BillingStatusResponse(BaseModel):
    subscription_status: str
    access_status: str
    trial_expires_at: str | None = None
    days_until_trial_ends: int | None = None
    next_billing_date: str | None = None
    days_until_next_billing: int | None = None
    grace_days_remaining: int | None = None
    is_trial: bool
    is_expired: bool
    should_warn: bool


class UpdateBillingRequest(BaseModel):
    subscription_status: Literal["trial", "active", "past_due", "expired"] | None = None
    next_billing_date: datetime | None = None
    billing_email: str | None = None
    billing_nit: str | None = None
    billing_razon_social: str | None = None
    reason: str = Field(min_length=3, max_length=500)


class CheckoutResponse(BaseModel):
    store_name: str
    billing_email: str | None = None
    billing_nit: str | None = None
    billing_razon_social: str | None = None
    subscription_status: str


class BillingHistoryEntryResponse(BaseModel):
    id: UUID
    reason: str
    changed_by_email: str
    old_values: dict = Field(default_factory=dict)
    new_values: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class BillingHistoryResponse(BaseModel):
    items: list[BillingHistoryEntryResponse]
