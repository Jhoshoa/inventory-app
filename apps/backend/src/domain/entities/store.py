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

    @staticmethod
    def create(name: str, address: str | None = None, phone: str | None = None) -> "Store":
        return Store(id=uuid4(), name=name, address=address, phone=phone)

    @property
    def is_trial_active(self) -> bool:
        if self.trial_expires_at is None:
            return True
        return datetime.now(timezone.utc) < self.trial_expires_at

    @property
    def days_until_trial_ends(self) -> int | None:
        if self.trial_expires_at is None:
            return None
        remaining = (self.trial_expires_at - datetime.now(timezone.utc)).days
        return max(remaining, 0)

    @property
    def should_warn_trial_ending(self) -> bool:
        if self.trial_expires_at is None:
            return False
        remaining = self.days_until_trial_ends
        if remaining is None:
            return False
        return 0 < remaining <= settings.TRIAL_WARN_DAYS

    @staticmethod
    def calculate_trial_expiry() -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=settings.TRIAL_DAYS)
