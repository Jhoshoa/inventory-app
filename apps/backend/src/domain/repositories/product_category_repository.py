from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.product_category import ProductCategory


class IProductCategoryRepository(ABC):
    @abstractmethod
    async def save(self, category: ProductCategory) -> ProductCategory: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, category_id: UUID) -> ProductCategory | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID, include_inactive: bool = False) -> list[ProductCategory]: ...

    @abstractmethod
    async def name_exists(self, store_id: UUID, name: str, exclude_category_id: UUID | None = None) -> bool: ...

    @abstractmethod
    async def sku_prefix_exists(self, store_id: UUID, sku_prefix: str, exclude_category_id: UUID | None = None) -> bool: ...

    @abstractmethod
    async def reserve_next_sku(self, store_id: UUID, category_id: UUID) -> str | None: ...
