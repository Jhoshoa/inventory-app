from fastapi import APIRouter, Depends
from src.application.use_cases.store.get_store import GetStoreUseCase
from src.application.use_cases.store.update_store import UpdateStoreUseCase, UpdateStoreInput
from src.presentation.dependencies import get_current_user
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.presentation.dependencies import get_product_repo

router = APIRouter(prefix="/store", tags=["store"])


@router.get("")
async def get_store(user: dict = Depends(get_current_user)):
    return {"store_id": str(user["store_id"])}


@router.patch("")
async def update_store(user: dict = Depends(get_current_user)):
    return {"status": "ok"}
