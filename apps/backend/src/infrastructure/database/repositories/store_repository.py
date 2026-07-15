from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.store import Store
from src.domain.repositories.store_repository import IStoreRepository
from src.infrastructure.database.models.store_model import StoreModel


def _naive_if_aware(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def _aware_if_naive(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class StoreRepository(IStoreRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, store: Store) -> Store:
        model = await self._session.get(StoreModel, store.id)
        if model is None:
            model = StoreModel(id=store.id)
            self._session.add(model)
        model.name = store.name
        model.address = store.address
        model.phone = store.phone
        model.is_active = store.is_active
        model.timezone = store.timezone
        model.first_business_date = store.first_business_date
        model.trial_expires_at = _naive_if_aware(store.trial_expires_at)
        model.access_status = store.access_status
        model.subscription_status = store.subscription_status
        model.next_billing_date = _naive_if_aware(store.next_billing_date)
        model.grace_period_started_at = _naive_if_aware(store.grace_period_started_at)
        model.subscription_started_at = _naive_if_aware(store.subscription_started_at)
        model.billing_email = store.billing_email
        model.billing_nit = store.billing_nit
        model.billing_razon_social = store.billing_razon_social
        await self._session.flush()
        return store

    async def get_by_id(self, store_id: UUID) -> Store | None:
        model = await self._session.get(StoreModel, store_id)
        if model is None or not model.is_active:
            return None
        return self._to_entity(model)

    async def set_first_business_date(self, store_id: UUID, first_business_date: date) -> None:
        await self._session.execute(
            update(StoreModel)
            .where(StoreModel.id == store_id, StoreModel.first_business_date.is_(None))
            .values(first_business_date=first_business_date)
        )
        await self._session.flush()

    async def list_by_expired_trial(self, cutoff: datetime) -> list[Store]:
        stmt = (
            select(StoreModel)
            .where(
                StoreModel.subscription_status == "trial",
                StoreModel.trial_expires_at.isnot(None),
                StoreModel.trial_expires_at < _naive_if_aware(cutoff),
                StoreModel.access_status == "active",
            )
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(row) for row in result.scalars()]

    async def list_by_past_due_expired(self, cutoff: datetime) -> list[Store]:
        stmt = (
            select(StoreModel)
            .where(
                StoreModel.subscription_status == "past_due",
                StoreModel.grace_period_started_at.isnot(None),
                StoreModel.grace_period_started_at < _naive_if_aware(cutoff),
                StoreModel.access_status == "active",
            )
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(row) for row in result.scalars()]

    async def update_access_status(self, store_id: UUID, access_status: str) -> None:
        await self._session.execute(
            update(StoreModel)
            .where(StoreModel.id == store_id)
            .values(
                access_status=access_status,
                is_active=(access_status == "active"),
            )
        )
        await self._session.flush()

    async def batch_update_expired(
        self,
        store_ids: list[UUID],
        access_status: str,
        subscription_status: str,
    ) -> None:
        if not store_ids:
            return
        await self._session.execute(
            update(StoreModel)
            .where(StoreModel.id.in_(store_ids))
            .values(
                access_status=access_status,
                subscription_status=subscription_status,
                is_active=(access_status == "active"),
            )
        )
        await self._session.flush()

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
    ) -> None:
        values: dict = {}
        if subscription_status is not None:
            values["subscription_status"] = subscription_status
        if next_billing_date is not None:
            values["next_billing_date"] = _naive_if_aware(next_billing_date)
        if grace_period_started_at is not None:
            values["grace_period_started_at"] = _naive_if_aware(grace_period_started_at)
        if billing_email is not None:
            values["billing_email"] = billing_email
        if billing_nit is not None:
            values["billing_nit"] = billing_nit
        if billing_razon_social is not None:
            values["billing_razon_social"] = billing_razon_social
        if not values:
            return
        await self._session.execute(
            update(StoreModel).where(StoreModel.id == store_id).values(**values)
        )
        await self._session.flush()

    @staticmethod
    def _to_entity(model: StoreModel) -> Store:
        return Store(
            id=model.id,
            name=model.name,
            address=model.address,
            phone=model.phone,
            is_active=model.is_active,
            timezone=model.timezone or "America/La_Paz",
            first_business_date=model.first_business_date,
            trial_expires_at=_aware_if_naive(model.trial_expires_at),
            access_status=model.access_status,
            subscription_status=model.subscription_status,
            next_billing_date=_aware_if_naive(model.next_billing_date),
            grace_period_started_at=_aware_if_naive(model.grace_period_started_at),
            subscription_started_at=_aware_if_naive(model.subscription_started_at),
            billing_email=model.billing_email,
            billing_nit=model.billing_nit,
            billing_razon_social=model.billing_razon_social,
        )
