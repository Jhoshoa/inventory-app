from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.inventory_import import InventoryImport, InventoryImportItem


class IInventoryImportRepository(ABC):
    @abstractmethod
    async def create(self, inventory_import: InventoryImport) -> InventoryImport: ...

    @abstractmethod
    async def list_by_store(
        self,
        store_id: UUID,
        *,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[InventoryImport], int]: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, import_id: UUID) -> InventoryImport | None: ...

    @abstractmethod
    async def update_item(self, item: InventoryImportItem) -> InventoryImportItem: ...

    @abstractmethod
    async def mark_confirmed(self, inventory_import: InventoryImport) -> InventoryImport: ...

    @abstractmethod
    async def cancel(self, inventory_import: InventoryImport) -> InventoryImport: ...
