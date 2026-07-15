from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID

from src.domain.entities.store import Store


class IStoreRepository(ABC):
    @abstractmethod
    async def save(self, store: Store) -> Store: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID) -> Store | None: ...

    @abstractmethod
    async def set_first_business_date(self, store_id: UUID, first_business_date: date) -> None: ...

    @abstractmethod
    async def list_by_expired_trial(self, cutoff: datetime) -> list[Store]: ...

    @abstractmethod
    async def list_by_past_due_expired(self, cutoff: datetime) -> list[Store]: ...

    @abstractmethod
    async def update_access_status(self, store_id: UUID, access_status: str) -> None: ...

    @abstractmethod
    async def batch_update_expired(
        self,
        store_ids: list[UUID],
        access_status: str,
        subscription_status: str,
    ) -> None: ...

    @abstractmethod
    async def update_subscription(
        self,
        store_id: UUID,
        *,
        subscription_status: str | None = None,
        next_billing_date: datetime | None = None,
        grace_period_started_at: datetime | None = None,
        billing_email: str | None = None,
        billing_nit: str | None = None,
        billing_razon_social: str | None = None,
    ) -> None: ...
