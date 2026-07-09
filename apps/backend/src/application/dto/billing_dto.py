from datetime import datetime

from pydantic import BaseModel


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
    subscription_status: str | None = None
    next_billing_date: datetime | None = None
    billing_email: str | None = None
    billing_nit: str | None = None
    billing_razon_social: str | None = None
    reason: str
