from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.inventory_import import InventoryImport
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository


class GetInventoryImportUseCase:
    def __init__(self, repo: IInventoryImportRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, import_id: UUID) -> InventoryImport:
        inventory_import = await self._repo.get_by_id(store_id, import_id)
        if not inventory_import:
            raise NotFoundError("Importacion no encontrada")
        return inventory_import
