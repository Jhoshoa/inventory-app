from dataclasses import dataclass
from uuid import UUID

from src.application.dto.storefront_settings_dto import storefront_settings_of
from src.application.exceptions import NotFoundError
from src.application.use_cases.storefront.get_public_storefront import (
    GetPublicStorefrontUseCase,
)
from src.domain.entities.product import Product
from src.domain.entities.store import Store
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class ListPublicProductsResult:
    items: list[Product]
    total: int
    store: Store


@dataclass
class ListFeaturedProductsResult:
    items: list[Product]
    store: Store
    # "manual": los eligio el dueno. "on_sale": no eligio, se muestran ofertas.
    source: str


@dataclass
class GetPublicProductResult:
    product: Product
    store: Store


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
        settings = storefront_settings_of(resolved.store)
        items, total = await self._product_repo.list_public(
            resolved.store.id,
            q=q,
            category_id=category_id,
            on_sale=on_sale,
            in_stock_only=settings.hide_out_of_stock,
            sort=sort,
            limit=limit,
            offset=offset,
        )
        return ListPublicProductsResult(items=items, total=total, store=resolved.store)


class GetPublicProductUseCase:
    def __init__(self, store_repo: IStoreRepository, product_repo: IProductRepository):
        self._store_repo = store_repo
        self._product_repo = product_repo

    async def execute(self, slug: str, product_id: UUID) -> GetPublicProductResult:
        # Un agotado oculto del listado sigue abriendo por su link directo
        # (alguien lo pudo haber compartido): se ve como "Agotado".
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(slug)
        product = await self._product_repo.get_public_by_id(resolved.store.id, product_id)
        if product is None:
            raise NotFoundError("Producto no encontrado")
        return GetPublicProductResult(product=product, store=resolved.store)


class ListFeaturedProductsUseCase:
    def __init__(self, store_repo: IStoreRepository, product_repo: IProductRepository):
        self._store_repo = store_repo
        self._product_repo = product_repo

    async def execute(self, slug: str, *, limit: int = 10) -> ListFeaturedProductsResult:
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(slug)
        settings = storefront_settings_of(resolved.store)
        if settings.featured_product_ids:
            items = await self._product_repo.list_public_by_ids(
                resolved.store.id,
                settings.featured_product_ids,
                in_stock_only=settings.hide_out_of_stock,
            )
            # Si todos los elegidos se borraron o agotaron, mejor las ofertas
            # que un carrusel vacio.
            if items:
                return ListFeaturedProductsResult(items=items[:limit], store=resolved.store, source="manual")
        items, _ = await self._product_repo.list_public(
            resolved.store.id,
            on_sale=True,
            in_stock_only=settings.hide_out_of_stock,
            limit=limit,
        )
        return ListFeaturedProductsResult(items=items, store=resolved.store, source="on_sale")
