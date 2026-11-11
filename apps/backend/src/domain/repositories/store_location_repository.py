from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.store_location import ProductLocation, ProductLocationKind, StoreLocation


class IStoreLocationRepository(ABC):
    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[StoreLocation]: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, location_id: UUID) -> StoreLocation | None: ...

    @abstractmethod
    async def get_by_ids(self, store_id: UUID, location_ids: list[UUID]) -> list[StoreLocation]: ...

    @abstractmethod
    async def save(self, location: StoreLocation) -> StoreLocation: ...

    @abstractmethod
    async def delete(self, store_id: UUID, location_id: UUID) -> None: ...

    @abstractmethod
    async def for_products(self, store_id: UUID, product_ids: list[UUID]) -> dict[UUID, list[ProductLocation]]: ...

    @abstractmethod
    async def set_for_product(
        self, store_id: UUID, product_id: UUID, items: list[tuple[UUID, ProductLocationKind]]
    ) -> None: ...
