from fastapi import APIRouter, Depends

from src.application.dto.exchange_rate_dto import (
    ExchangeRateResponseDTO,
    ExchangeRateUpsertDTO,
)
from src.infrastructure.database.repositories.exchange_rate_repository import (
    ExchangeRateRepository,
)
from src.presentation.dependencies import get_current_user, get_exchange_rate_repo

router = APIRouter(prefix="/exchange-rates", tags=["exchange-rates"])


@router.get("", response_model=list[ExchangeRateResponseDTO])
async def list_exchange_rates(
    user: dict = Depends(get_current_user),
    repo: ExchangeRateRepository = Depends(get_exchange_rate_repo),
):
    return await repo.list_latest()


@router.post("", response_model=ExchangeRateResponseDTO, status_code=201)
async def upsert_exchange_rate(
    dto: ExchangeRateUpsertDTO,
    user: dict = Depends(get_current_user),
    repo: ExchangeRateRepository = Depends(get_exchange_rate_repo),
):
    return await repo.upsert(dto.date, dto.source, dto.buy_price, dto.sell_price)
