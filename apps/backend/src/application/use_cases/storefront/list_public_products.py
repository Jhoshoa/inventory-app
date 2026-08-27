from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.application.use_cases.storefront.get_public_storefront import (
    GetPublicStorefrontUseCase,
)
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class ListPublicProductsResult:
    items: list[Product]
    total: int


class ListPublicProductsUseCase:
    def __init__(self, store_repo: IStoreRepository, product_repo: IProductRepository):
        self._store_repo = store_repo
        self._product_repo = product_repo

    async def execute(
        self,
        slug: str,
        *,
        q: str | None = None,
        category_id: UUID | None = None,
        on_sale: bool = False,
        sort: str = "name",
        limit: int = 24,
        offset: int = 0,
    ) -> ListPublicProductsResult:
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(slug)
        items, total = await self._product_repo.list_public(
            resolved.store.id,
            q=q,
            category_id=category_id,
            on_sale=on_sale,
            sort=sort,
            limit=limit,
            offset=offset,
        )
        return ListPublicProductsResult(items=items, total=total)


class GetPublicProductUseCase:
    def __init__(self, store_repo: IStoreRepository, product_repo: IProductRepository):
        self._store_repo = store_repo
        self._product_repo = product_repo

    async def execute(self, slug: str, product_id: UUID) -> Product:
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(slug)
        product = await self._product_repo.get_public_by_id(resolved.store.id, product_id)
        if product is None:
            raise NotFoundError("Producto no encontrado")
        return product
