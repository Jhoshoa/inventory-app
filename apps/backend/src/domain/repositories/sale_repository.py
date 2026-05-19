from abc import ABC, abstractmethod
from uuid import UUID
from src.domain.entities.sale import Sale


class ISaleRepository(ABC):
    @abstractmethod
    async def save(self, sale: Sale) -> Sale: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, sale_id: UUID) -> Sale | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[Sale]: ...
