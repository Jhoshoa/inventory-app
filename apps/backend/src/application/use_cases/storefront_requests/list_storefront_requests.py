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
    status_counts: dict[str, int]


class ListStorefrontRequestsUseCase:
    def __init__(self, repo: IStorefrontRequestRepository):
        self._repo = repo

    async def execute(
        self, store_id: UUID, *, limit: int = 50, offset: int = 0, status: str | None = None
    ) -> ListStorefrontRequestsResult:
        items, total = await self._repo.list_by_store(store_id, limit=limit, offset=offset, status=status)
        counts = await self._repo.count_by_status(store_id)
        # Siempre las tres pestanas, aunque alguna este en 0.
        status_counts = {key: counts.get(key, 0) for key in ("pending", "contacted", "closed")}
        return ListStorefrontRequestsResult(
            items=items,
            total=total,
            pending_count=status_counts["pending"],
            status_counts=status_counts,
        )
