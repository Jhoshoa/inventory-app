from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.store import Store
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class UpdateStoreInput:
    store_id: UUID
    name: str | None = None
    address: str | None = None
    phone: str | None = None


class UpdateStoreUseCase:
    def __init__(self, repo: IStoreRepository):
        self._repo = repo

    async def execute(self, input: UpdateStoreInput) -> Store:
        store = await self._repo.get_by_id(input.store_id)
        if not store:
            raise NotFoundError("Tienda no encontrada")
        if input.name is not None:
            store.name = input.name
        if input.address is not None:
            store.address = input.address
        if input.phone is not None:
            store.phone = input.phone
        return await self._repo.save(store)
