from abc import ABC, abstractmethod
from src.domain.entities.exchange_rate import ExchangeRate


class IExchangeRateProvider(ABC):
    @abstractmethod
    async def fetch_rates(self) -> list[ExchangeRate]: ...
