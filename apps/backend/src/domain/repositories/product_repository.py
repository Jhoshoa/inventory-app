from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.product import Product


class IProductRepository(ABC):
    @abstractmethod
    async def save(self, product: Product) -> Product: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, product_id: UUID) -> Product | None: ...

    @abstractmethod
    async def get_by_ids(self, store_id: UUID, product_ids: list[UUID]) -> list[Product]: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[Product]: ...

    @abstractmethod
    async def search(
        self,
        store_id: UUID,
        *,
        q: str | None = None,
        category: str | None = None,
        category_id: UUID | None = None,
        stock: str = "all",
        limit: int = 50,
        offset: int = 0,
        sort: str = "name",
        direction: str = "asc",
    ) -> tuple[list[Product], int]: ...

    @abstractmethod
    async def get_by_qr_code(self, store_id: UUID, qr_code: str) -> Product | None: ...

    @abstractmethod
    async def qr_code_exists(self, qr_code: str, exclude_product_id: UUID | None = None) -> bool: ...

    @abstractmethod
    async def sku_exists(self, store_id: UUID, sku: str, exclude_product_id: UUID | None = None) -> bool: ...

    @abstractmethod
    async def product_name_exists(self, store_id: UUID, name: str, unit: str, exclude_product_id: UUID | None = None) -> bool: ...

    @abstractmethod
    async def skus_exist(self, store_id: UUID, skus: list[str]) -> set[str]: ...

    @abstractmethod
    async def qr_codes_exist(self, qr_codes: list[str]) -> set[str]: ...

    @abstractmethod
    async def names_exist(self, store_id: UUID, names: list[tuple[str, str]]) -> set[str]: ...

    @abstractmethod
    async def list_low_stock(self, store_id: UUID, limit: int = 20) -> list[Product]: ...

    @abstractmethod
    async def count_by_store(self, store_id: UUID) -> int: ...

    @abstractmethod
    async def count_low_stock(self, store_id: UUID) -> int: ...

    @abstractmethod
    async def count_out_of_stock(self, store_id: UUID) -> int: ...

    @abstractmethod
    async def list_for_export(self, store_id: UUID) -> list[Product]: ...

    @abstractmethod
    async def delete(self, store_id: UUID, product_id: UUID) -> None: ...

    @abstractmethod
    async def batch_update_stock(
        self,
        store_id: UUID,
        items: list[tuple[UUID, int, str, str | None, UUID | None, str | None]],
        *,
        sale_id: UUID | None = None,
        device_id: str | None = None,
    ) -> None: ...

    @abstractmethod
    async def update_stock(
        self,
        store_id: UUID,
        product_id: UUID,
        quantity: int,
        *,
        movement_type: str,
        reason: str | None = None,
        sale_id: UUID | None = None,
        device_id: str | None = None,
    ) -> Product: ...
