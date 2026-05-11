from abc import ABC, abstractmethod
from uuid import UUID
from src.domain.entities.product import Product


class IProductRepository(ABC):
    @abstractmethod
    async def save(self, product: Product) -> Product: ...

    @abstractmethod
    async def get_by_id(self, product_id: UUID) -> Product | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[Product]: ...

    @abstractmethod
    async def delete(self, product_id: UUID) -> None: ...

    @abstractmethod
    async def update_stock(self, product_id: UUID, quantity: int) -> Product: ...
