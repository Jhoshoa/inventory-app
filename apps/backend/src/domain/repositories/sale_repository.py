from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID
from typing import Any
from src.domain.entities.sale import Sale


class ISaleRepository(ABC):
    @abstractmethod
    async def save(self, sale: Sale) -> Sale: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, sale_id: UUID) -> Sale | None: ...

    @abstractmethod
    async def list_by_store(
        self,
        store_id: UUID,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        status: str = "all",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Sale], int]: ...

    @abstractmethod
    async def sales_summary_for_range(self, store_id: UUID, start: datetime, end: datetime) -> dict[str, Any]: ...

    @abstractmethod
    async def sales_summary_for_business_day(self, store_id: UUID, business_day_id: UUID) -> dict[str, Any]: ...

    @abstractmethod
    async def latest_sales(self, store_id: UUID, limit: int = 5) -> list[Sale]: ...

    @abstractmethod
    async def latest_sales_for_range(
        self,
        store_id: UUID,
        start: datetime,
        end: datetime,
        limit: int = 5,
    ) -> list[Sale]: ...

    @abstractmethod
    async def totals_by_payment_method(self, store_id: UUID, start: datetime, end: datetime) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def top_products(self, store_id: UUID, start: datetime, end: datetime, limit: int = 5) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def mark_voided(self, store_id: UUID, sale_id: UUID, reason: str) -> Sale | None: ...

    @abstractmethod
    async def list_for_export(self, store_id: UUID, start: datetime, end: datetime) -> list[dict[str, Any]]: ...
