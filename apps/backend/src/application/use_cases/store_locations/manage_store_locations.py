from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.domain.entities.store_location import StoreLocation
from src.domain.repositories.store_location_repository import IStoreLocationRepository

# Tope para que la lista de Ajustes y los selectores sigan siendo usables.
MAX_LOCATIONS_PER_STORE = 300


@dataclass
class StoreLocationInput:
    store_id: UUID
    zone: str
    shelf: str | None = None
    level: str | None = None


class ListStoreLocationsUseCase:
    def __init__(self, repo: IStoreLocationRepository):
        self._repo = repo

    async def execute(self, store_id: UUID) -> list[StoreLocation]:
        return await self._repo.list_by_store(store_id)


async def _ensure_unique(repo: IStoreLocationRepository, candidate: StoreLocation) -> list[StoreLocation]:
    existing = await repo.list_by_store(candidate.store_id)
    if any(other.id != candidate.id and other.key() == candidate.key() for other in existing):
        raise ConflictError(f"Ya existe la ubicacion '{candidate.label}'")
    return existing


class CreateStoreLocationUseCase:
    def __init__(self, repo: IStoreLocationRepository):
        self._repo = repo

    async def execute(self, input: StoreLocationInput) -> StoreLocation:
        location = StoreLocation.create(store_id=input.store_id, zone=input.zone, shelf=input.shelf, level=input.level)
        existing = await _ensure_unique(self._repo, location)
        if len(existing) >= MAX_LOCATIONS_PER_STORE:
            raise ConflictError(f"La tienda ya tiene {MAX_LOCATIONS_PER_STORE} ubicaciones")
        return await self._repo.save(location)


class UpdateStoreLocationUseCase:
    def __init__(self, repo: IStoreLocationRepository):
        self._repo = repo

    async def execute(self, location_id: UUID, input: StoreLocationInput) -> StoreLocation:
        current = await self._repo.get_by_id(input.store_id, location_id)
        if current is None:
            raise NotFoundError("Ubicacion no encontrada")
        updated = StoreLocation(
            id=current.id, store_id=current.store_id, zone=input.zone, shelf=input.shelf, level=input.level
        )
        await _ensure_unique(self._repo, updated)
        return await self._repo.save(updated)


class DeleteStoreLocationUseCase:
    def __init__(self, repo: IStoreLocationRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, location_id: UUID) -> None:
        if await self._repo.get_by_id(store_id, location_id) is None:
            raise NotFoundError("Ubicacion no encontrada")
        await self._repo.delete(store_id, location_id)
