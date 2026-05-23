from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


@dataclass
class SearchProductsInput:
    store_id: UUID
    q: str | None = None
    category: str | None = None
    category_id: UUID | None = None
    stock: str = "all"
    limit: int = 50
    offset: int = 0
    sort: str = "name"
    direction: str = "asc"


class SearchProductsUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, input: SearchProductsInput) -> tuple[list[Product], int]:
        return await self._repo.search(
            input.store_id,
            q=input.q,
            category=input.category,
            category_id=input.category_id,
            stock=input.stock,
            limit=input.limit,
            offset=input.offset,
            sort=input.sort,
            direction=input.direction,
        )
