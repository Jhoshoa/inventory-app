from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal


class IExchangeRateRepository(ABC):
    @abstractmethod
    async def list_latest(self, limit: int = 20) -> list: ...

    @abstractmethod
    async def upsert(
        self,
        rate_date: date,
        source: str,
        buy_price: Decimal,
        sell_price: Decimal,
    ): ...
