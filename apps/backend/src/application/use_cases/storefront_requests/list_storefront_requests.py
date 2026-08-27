from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.storefront_request import StorefrontRequest
from src.domain.repositories.storefront_request_repository import (
    IStorefrontRequestRepository,
)


@dataclass
class ListStorefrontRequestsResult:
    items: list[StorefrontRequest]
    total: int
    pending_count: int


class ListStorefrontRequestsUseCase:
    def __init__(self, repo: IStorefrontRequestRepository):
        self._repo = repo

    async def execute(self, store_id: UUID, *, limit: int = 50, offset: int = 0) -> ListStorefrontRequestsResult:
        items, total = await self._repo.list_by_store(store_id, limit=limit, offset=offset)
        pending_count = await self._repo.count_pending(store_id)
        return ListStorefrontRequestsResult(items=items, total=total, pending_count=pending_count)
