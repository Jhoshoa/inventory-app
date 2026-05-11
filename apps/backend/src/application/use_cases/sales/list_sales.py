from uuid import UUID
from src.domain.entities.sale import Sale
from src.domain.repositories.sale_repository import ISaleRepository


class ListSalesUseCase:
    def __init__(self, repo: ISaleRepository):
        self._repo = repo

    async def execute(self, store_id: UUID) -> list[Sale]:
        return await self._repo.list_by_store(store_id)
