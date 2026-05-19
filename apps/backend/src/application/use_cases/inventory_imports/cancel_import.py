from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.domain.entities.inventory_import import InventoryImport, InventoryImportStatus
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository


class CancelInventoryImportUseCase:
    def __init__(self, repo: IInventoryImportRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, import_id: UUID) -> InventoryImport:
        inventory_import = await self._repo.get_by_id(store_id, import_id)
        if not inventory_import:
            raise NotFoundError("Importacion no encontrada")
        if inventory_import.status == InventoryImportStatus.CONFIRMED.value:
            raise ConflictError("No se puede cancelar una importacion confirmada")
        inventory_import.status = InventoryImportStatus.CANCELLED.value
        return await self._repo.cancel(inventory_import)
