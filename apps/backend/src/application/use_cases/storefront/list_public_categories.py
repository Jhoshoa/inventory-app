from dataclasses import dataclass

from src.application.dto.storefront_settings_dto import storefront_settings_of
from src.application.use_cases.storefront.get_public_storefront import (
    GetPublicStorefrontUseCase,
)
from src.domain.entities.product_category import ProductCategory
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class PublicCategoryWithCount:
    category: ProductCategory
    product_count: int


class ListPublicCategoriesUseCase:
    def __init__(self, store_repo: IStoreRepository, category_repo: IProductCategoryRepository):
        self._store_repo = store_repo
        self._category_repo = category_repo

    async def execute(self, slug: str) -> list[PublicCategoryWithCount]:
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(slug)
        settings = storefront_settings_of(resolved.store)
        pairs = await self._category_repo.list_public_with_counts(
            resolved.store.id, in_stock_only=settings.hide_out_of_stock
        )
        return [PublicCategoryWithCount(category=c, product_count=n) for c, n in pairs]
