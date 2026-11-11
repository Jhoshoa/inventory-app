from uuid import UUID

from fastapi import APIRouter, Depends

from src.application.dto.store_location_dto import (
    StoreLocationInputDTO,
    StoreLocationListResponseDTO,
    StoreLocationResponseDTO,
)
from src.application.use_cases.store_locations.manage_store_locations import (
    CreateStoreLocationUseCase,
    DeleteStoreLocationUseCase,
    ListStoreLocationsUseCase,
    StoreLocationInput,
    UpdateStoreLocationUseCase,
)
from src.domain.entities.store_location import StoreLocation
from src.infrastructure.database.repositories.store_location_repository import (
    StoreLocationRepository,
)
from src.presentation.dependencies import get_store_location_repo, require_active_user, require_owner

router = APIRouter(prefix="/store-locations", tags=["store-locations"])


def _to_response(location: StoreLocation) -> StoreLocationResponseDTO:
    return StoreLocationResponseDTO(
        id=location.id,
        zone=location.zone,
        shelf=location.shelf,
        level=location.level,
        label=location.label,
        product_count=location.product_count,
    )


@router.get("", response_model=StoreLocationListResponseDTO)
async def list_store_locations(
    user=Depends(require_active_user),
    repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    locations = await ListStoreLocationsUseCase(repo).execute(user.store_id)
    return StoreLocationListResponseDTO(items=[_to_response(location) for location in locations])


@router.post("", response_model=StoreLocationResponseDTO, status_code=201)
async def create_store_location(
    dto: StoreLocationInputDTO,
    user=Depends(require_owner),
    repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    location = await CreateStoreLocationUseCase(repo).execute(
        StoreLocationInput(store_id=user.store_id, zone=dto.zone, shelf=dto.shelf, level=dto.level)
    )
    return _to_response(location)


@router.patch("/{location_id}", response_model=StoreLocationResponseDTO)
async def update_store_location(
    location_id: UUID,
    dto: StoreLocationInputDTO,
    user=Depends(require_owner),
    repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    location = await UpdateStoreLocationUseCase(repo).execute(
        location_id,
        StoreLocationInput(store_id=user.store_id, zone=dto.zone, shelf=dto.shelf, level=dto.level),
    )
    return _to_response(location)


@router.delete("/{location_id}", status_code=204)
async def delete_store_location(
    location_id: UUID,
    user=Depends(require_owner),
    repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    await DeleteStoreLocationUseCase(repo).execute(user.store_id, location_id)
