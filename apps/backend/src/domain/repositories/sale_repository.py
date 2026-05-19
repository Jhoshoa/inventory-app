from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID
from typing import Any
from src.domain.entities.sale import Sale


class ISaleRepository(ABC):
    @abstractmethod
    async def save(self, sale: Sale) -> Sale: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, sale_id: UUID) -> Sale | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[Sale]: ...

    @abstractmethod
    async def sales_summary_for_range(self, store_id: UUID, start: datetime, end: datetime) -> dict[str, Any]: ...

    @abstractmethod
    async def latest_sales(self, store_id: UUID, limit: int = 5) -> list[Sale]: ...

    @abstractmethod
    async def totals_by_payment_method(self, store_id: UUID, start: datetime, end: datetime) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def top_products(self, store_id: UUID, start: datetime, end: datetime, limit: int = 5) -> list[dict[str, Any]]: ...
