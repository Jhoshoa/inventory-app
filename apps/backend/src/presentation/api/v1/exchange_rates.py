from fastapi import APIRouter, Depends
from src.presentation.dependencies import get_current_user

router = APIRouter(prefix="/exchange-rates", tags=["exchange-rates"])


@router.get("")
async def list_exchange_rates(user: dict = Depends(get_current_user)):
    return []
