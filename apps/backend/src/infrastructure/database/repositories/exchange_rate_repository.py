from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.exchange_rate_model import ExchangeRateModel


class ExchangeRateRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_latest(self, limit: int = 20) -> list[ExchangeRateModel]:
        result = await self._session.execute(
            select(ExchangeRateModel)
            .order_by(ExchangeRateModel.date.desc(), ExchangeRateModel.source.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def upsert(
        self,
        rate_date: date,
        source: str,
        buy_price: Decimal,
        sell_price: Decimal,
    ) -> ExchangeRateModel:
        model = await self._session.get(
            ExchangeRateModel,
            {"date": rate_date, "source": source},
        )
        if model is None:
            model = ExchangeRateModel(date=rate_date, source=source)
            self._session.add(model)
        model.buy_price = buy_price
        model.sell_price = sell_price
        await self._session.flush()
        return model
