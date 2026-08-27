from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

TRIAL_DAYS = 30
GRACE_PERIOD_DAYS = 7
TRIAL_WARN_DAYS = 5


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
    suspended_at: datetime | None = None
    archived_at: datetime | None = None
    subscription_status: str = "trial"
    next_billing_date: datetime | None = None
    grace_period_started_at: datetime | None = None
    subscription_started_at: datetime | None = None
    billing_email: str | None = None
    billing_nit: str | None = None
    billing_razon_social: str | None = None
    allow_percentage_discount: bool = False
    max_percentage_discount: Decimal = Decimal(0)
    allow_manual_discount: bool = False
    max_manual_discount_amount: Decimal = Decimal(0)
    allow_cashier_discount_override: bool = False
    storefront_enabled: bool = False
    storefront_slug: str | None = None
    storefront_tier: str = "none"
    storefront_logo_url: str | None = None
    storefront_banner_url: str | None = None
    storefront_color_primary: str | None = None
    storefront_color_secondary: str | None = None
    storefront_description: str | None = None
    storefront_whatsapp: str | None = None

    @staticmethod
    def create(name: str, address: str | None = None, phone: str | None = None) -> "Store":
        return Store(id=uuid4(), name=name, address=address, phone=phone)

    @property
    def is_trial_active(self) -> bool:
        if self.subscription_status != "trial":
            return False
        if self.trial_expires_at is None:
            return True
        return datetime.now(UTC) < self.trial_expires_at

    @property
    def days_until_trial_ends(self) -> int | None:
        if self.subscription_status != "trial" or self.trial_expires_at is None:
            return None
        remaining = (self.trial_expires_at - datetime.now(UTC)).days
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
        return 0 < remaining <= TRIAL_WARN_DAYS

    @property
    def days_until_next_billing(self) -> int | None:
        if self.next_billing_date is None:
            return None
        remaining = (self.next_billing_date - datetime.now(UTC)).days
        return max(remaining, 0)

    @property
    def grace_days_remaining(self) -> int | None:
        if self.subscription_status != "past_due" or self.grace_period_started_at is None:
            return None
        elapsed = (datetime.now(UTC) - self.grace_period_started_at).days
        return max(GRACE_PERIOD_DAYS - elapsed, 0)

    @property
    def is_access_restricted(self) -> bool:
        if not self.is_active:
            return True
        if self.access_status != "active":
            return True
        if self.subscription_status == "expired":
            return True
        if (self.subscription_status == "trial"
                and self.trial_expires_at is not None
                and datetime.now(UTC) >= self.trial_expires_at):
            return True
        if (self.subscription_status == "past_due"
                and self.grace_period_started_at is not None
                and datetime.now(UTC) >= self.grace_period_started_at + timedelta(days=GRACE_PERIOD_DAYS)):
            return True
        return False

    @staticmethod
    def calculate_trial_expiry() -> datetime:
        return datetime.now(UTC) + timedelta(days=TRIAL_DAYS)
