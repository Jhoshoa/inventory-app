from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.inventory_import import InventoryImport
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository


@dataclass
class ListInventoryImportsInput:
    store_id: UUID
    status: str | None = None
    limit: int = 20
    offset: int = 0


class ListInventoryImportsUseCase:
    def __init__(self, repo: IInventoryImportRepository):
        self._repo = repo

    async def execute(self, input: ListInventoryImportsInput) -> tuple[list[InventoryImport], int]:
        return await self._repo.list_by_store(
            input.store_id,
            status=input.status,
            limit=input.limit,
            offset=input.offset,
        )
