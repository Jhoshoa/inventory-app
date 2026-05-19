from uuid import UUID

from fastapi import APIRouter, Depends
from src.application.dto.store_dto import StoreResponseDTO, StoreUpdateDTO
from src.application.use_cases.store.get_store import GetStoreUseCase
from src.application.use_cases.store.update_store import UpdateStoreUseCase, UpdateStoreInput
from src.presentation.dependencies import get_current_user, get_store_repo, require_owner
from src.infrastructure.database.repositories.store_repository import StoreRepository

router = APIRouter(prefix="/store", tags=["store"])


@router.get("", response_model=StoreResponseDTO)
async def get_store(
    user: dict = Depends(get_current_user),
    repo: StoreRepository = Depends(get_store_repo),
):
    return await GetStoreUseCase(repo).execute(UUID(str(user["store_id"])))


@router.patch("", response_model=StoreResponseDTO)
async def update_store(
    dto: StoreUpdateDTO,
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    repo: StoreRepository = Depends(get_store_repo),
):
    return await UpdateStoreUseCase(repo).execute(
        UpdateStoreInput(
            store_id=UUID(str(user["store_id"])),
            name=dto.name,
            address=dto.address,
            phone=dto.phone,
        )
    )
