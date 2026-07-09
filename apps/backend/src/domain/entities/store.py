from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

from src.config.settings import settings


@dataclass
class Store:
    id: UUID
    name: str
    address: str | None = None
    phone: str | None = None
    is_active: bool = True
    timezone: str = "America/La_Paz"
    first_business_date: date | None = None
    trial_expires_at: datetime | None = None
    access_status: str = "active"
    subscription_status: str = "trial"
    next_billing_date: datetime | None = None
    grace_period_started_at: datetime | None = None
    subscription_started_at: datetime | None = None
    billing_email: str | None = None
    billing_nit: str | None = None
    billing_razon_social: str | None = None

    @staticmethod
    def create(name: str, address: str | None = None, phone: str | None = None) -> "Store":
        return Store(id=uuid4(), name=name, address=address, phone=phone)

    @property
    def is_trial_active(self) -> bool:
        if self.subscription_status != "trial":
            return False
        if self.trial_expires_at is None:
            return True
        return datetime.now(timezone.utc) < self.trial_expires_at

    @property
    def days_until_trial_ends(self) -> int | None:
        if self.subscription_status != "trial" or self.trial_expires_at is None:
            return None
        remaining = (self.trial_expires_at - datetime.now(timezone.utc)).days
        return max(remaining, 0)

    @property
    def should_warn_trial_ending(self) -> bool:
        if self.subscription_status != "trial":
            return False
        if self.trial_expires_at is None:
            return False
        remaining = self.days_until_trial_ends
        if remaining is None:
            return False
        return 0 < remaining <= settings.TRIAL_WARN_DAYS

    @property
    def days_until_next_billing(self) -> int | None:
        if self.next_billing_date is None:
            return None
        remaining = (self.next_billing_date - datetime.now(timezone.utc)).days
        return max(remaining, 0)

    @property
    def grace_days_remaining(self) -> int | None:
        if self.subscription_status != "past_due" or self.grace_period_started_at is None:
            return None
        elapsed = (datetime.now(timezone.utc) - self.grace_period_started_at).days
        return max(settings.GRACE_PERIOD_DAYS - elapsed, 0)

    @property
    def is_access_restricted(self) -> bool:
        if self.access_status != "active":
            return True
        if self.subscription_status == "expired":
            return True
        if (self.subscription_status == "trial"
                and self.trial_expires_at is not None
                and datetime.now(timezone.utc) >= self.trial_expires_at):
            return True
        if (self.subscription_status == "past_due"
                and self.grace_period_started_at is not None
                and datetime.now(timezone.utc) >= self.grace_period_started_at + timedelta(days=settings.GRACE_PERIOD_DAYS)):
            return True
        return False

    @staticmethod
    def calculate_trial_expiry() -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=settings.TRIAL_DAYS)
