from dataclasses import dataclass
from decimal import Decimal
from datetime import date


@dataclass
class ExchangeRate:
    date: date
    source: str
    buy_price: Decimal
    sell_price: Decimal

    @staticmethod
    def create(date: date, source: str, buy_price: Decimal, sell_price: Decimal) -> "ExchangeRate":
        return ExchangeRate(date=date, source=source, buy_price=buy_price, sell_price=sell_price)
