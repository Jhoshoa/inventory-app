from uuid import UUID
from src.domain.entities.store import Store
from src.domain.repositories.store_repository import IStoreRepository
from src.application.exceptions import NotFoundError


class GetStoreUseCase:
    def __init__(self, repo: IStoreRepository):
        self._repo = repo

    async def execute(self, store_id: UUID) -> Store:
        store = await self._repo.get_by_id(store_id)
        if not store:
            raise NotFoundError("Tienda no encontrada")
        return store
