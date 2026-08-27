from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.storefront_request import StorefrontRequest


class IStorefrontRequestRepository(ABC):
    @abstractmethod
    async def save(self, request: StorefrontRequest) -> StorefrontRequest: ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, request_id: UUID) -> StorefrontRequest | None: ...

    @abstractmethod
    async def list_by_store(
        self, store_id: UUID, *, limit: int = 50, offset: int = 0
    ) -> tuple[list[StorefrontRequest], int]: ...

    @abstractmethod
    async def count_pending(self, store_id: UUID) -> int: ...

    @abstractmethod
    async def update_status(self, store_id: UUID, request_id: UUID, status: str) -> StorefrontRequest | None: ...
