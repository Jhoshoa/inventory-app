from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from src.application.dto.storefront_dto import (
    PublicStorefrontCategoryDTO,
    PublicStorefrontDTO,
    PublicStorefrontFeaturedDTO,
    PublicStorefrontProductDTO,
    PublicStorefrontProductListDTO,
)
from src.application.dto.storefront_request_dto import (
    CreateStorefrontOrderDTO,
    CreateStorefrontRequestDTO,
    StorefrontOrderResponseDTO,
    StorefrontRequestResponseDTO,
)
from src.application.dto.storefront_settings_dto import storefront_settings_of
from src.application.exceptions import NotFoundError
from src.application.use_cases.storefront.get_public_storefront import (
    GetPublicStorefrontUseCase,
)
from src.application.use_cases.storefront.list_public_categories import (
    ListPublicCategoriesUseCase,
)
from src.application.use_cases.storefront.list_public_products import (
    GetPublicProductUseCase,
    ListFeaturedProductsUseCase,
    ListPublicProductsUseCase,
)
from src.application.use_cases.storefront_requests.create_storefront_request import (
    CreateStorefrontOrderInput,
    CreateStorefrontOrderUseCase,
    CreateStorefrontRequestInput,
    CreateStorefrontRequestUseCase,
    StorefrontOrderLineInput,
)
from src.infrastructure.database.repositories.product_category_repository import (
    ProductCategoryRepository,
)
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.storefront_request_repository import (
    StorefrontRequestRepository,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    storefront_ip_rate_limiter,
    storefront_request_rate_limiter,
    storefront_slug_rate_limiter,
)
from src.presentation.dependencies import (
    get_product_category_repo,
    get_product_repo,
    get_storefront_request_repo,
    get_store_repo,
)

router = APIRouter(prefix="/public/storefront", tags=["public"])


def _servable_image(url: str | None) -> str | None:
    # La web solo carga imagenes de Cloudinary (CSP img-src). Un logo/banner
    # guardado como URL externa antes de que se subieran se veria roto: se omite.
    return url if url and url.startswith("https://res.cloudinary.com/") else None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(request: Request, slug: str) -> None:
    if not storefront_ip_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta nuevamente en unos minutos.")
    if not storefront_slug_rate_limiter.is_allowed(slug):
        raise HTTPException(status_code=429, detail="Este catalogo esta recibiendo mucho trafico. Intenta nuevamente en unos minutos.")


@router.get("/{slug}", response_model=PublicStorefrontDTO)
async def get_storefront(
    slug: str,
    request: Request,
    store_repo: StoreRepository = Depends(get_store_repo),
):
    _check_rate_limit(request, slug)
    try:
        result = await GetPublicStorefrontUseCase(store_repo).execute(slug)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    store = result.store
    return PublicStorefrontDTO(
        name=store.name,
        tier=store.storefront_tier,
        logo_url=_servable_image(store.storefront_logo_url),
        banner_url=_servable_image(store.storefront_banner_url),
        color_primary=store.storefront_color_primary,
        color_secondary=store.storefront_color_secondary,
        description=store.storefront_description,
        whatsapp=store.storefront_whatsapp or store.phone,
        payment_qr_url=store.storefront_payment_qr_url,
        payment_instructions=store.storefront_payment_instructions,
        timezone=store.timezone,
        settings=storefront_settings_of(store),
    )


@router.get("/{slug}/categories", response_model=list[PublicStorefrontCategoryDTO])
async def list_storefront_categories(
    slug: str,
    request: Request,
    store_repo: StoreRepository = Depends(get_store_repo),
    category_repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    _check_rate_limit(request, slug)
    try:
        results = await ListPublicCategoriesUseCase(store_repo, category_repo).execute(slug)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return [
        PublicStorefrontCategoryDTO(id=r.category.id, name=r.category.name, product_count=r.product_count)
        for r in results
    ]


@router.get("/{slug}/products", response_model=PublicStorefrontProductListDTO)
async def list_storefront_products(
    slug: str,
    request: Request,
    q: str | None = Query(default=None, max_length=100),
    category_id: UUID | None = Query(default=None),
    on_sale: bool = Query(default=False),
    sort: Literal["name", "price_asc", "price_desc", "popular"] = Query(default="name"),
    limit: int = Query(default=24, ge=1, le=60),
    offset: int = Query(default=0, ge=0),
    store_repo: StoreRepository = Depends(get_store_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
):
    _check_rate_limit(request, slug)
    try:
        result = await ListPublicProductsUseCase(store_repo, product_repo).execute(
            slug, q=q, category_id=category_id, on_sale=on_sale, sort=sort, limit=limit, offset=offset
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    show_low_stock = storefront_settings_of(result.store).stock_display == "all"
    return PublicStorefrontProductListDTO(
        items=[PublicStorefrontProductDTO.from_product(p, show_low_stock=show_low_stock) for p in result.items],
        total=result.total,
        limit=limit,
        offset=offset,
    )


@router.get("/{slug}/featured", response_model=PublicStorefrontFeaturedDTO)
async def list_storefront_featured(
    slug: str,
    request: Request,
    store_repo: StoreRepository = Depends(get_store_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
):
    _check_rate_limit(request, slug)
    try:
        result = await ListFeaturedProductsUseCase(store_repo, product_repo).execute(slug)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    show_low_stock = storefront_settings_of(result.store).stock_display == "all"
    return PublicStorefrontFeaturedDTO(
        items=[PublicStorefrontProductDTO.from_product(p, show_low_stock=show_low_stock) for p in result.items],
        source=result.source,
    )


@router.get("/{slug}/products/{product_id}", response_model=PublicStorefrontProductDTO)
async def get_storefront_product(
    slug: str,
    product_id: UUID,
    request: Request,
    store_repo: StoreRepository = Depends(get_store_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
):
    _check_rate_limit(request, slug)
    try:
        result = await GetPublicProductUseCase(store_repo, product_repo).execute(slug, product_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    show_low_stock = storefront_settings_of(result.store).stock_display == "all"
    return PublicStorefrontProductDTO.from_product(result.product, show_low_stock=show_low_stock)


@router.post(
    "/{slug}/products/{product_id}/requests",
    response_model=StorefrontRequestResponseDTO,
    status_code=201,
)
async def create_storefront_request(
    slug: str,
    product_id: UUID,
    dto: CreateStorefrontRequestDTO,
    request: Request,
    store_repo: StoreRepository = Depends(get_store_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
    request_repo: StorefrontRequestRepository = Depends(get_storefront_request_repo),
):
    _check_rate_limit(request, slug)
    if not storefront_request_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta nuevamente en unos minutos.")

    try:
        result = await CreateStorefrontRequestUseCase(store_repo, product_repo, request_repo).execute(
            CreateStorefrontRequestInput(
                slug=slug,
                product_id=product_id,
                customer_name=dto.customer_name,
                customer_phone=dto.customer_phone,
                note=dto.note,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return result


@router.post("/{slug}/orders", response_model=StorefrontOrderResponseDTO, status_code=201)
async def create_storefront_order(
    slug: str,
    dto: CreateStorefrontOrderDTO,
    request: Request,
    store_repo: StoreRepository = Depends(get_store_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
    request_repo: StorefrontRequestRepository = Depends(get_storefront_request_repo),
):
    _check_rate_limit(request, slug)
    if not storefront_request_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta nuevamente en unos minutos.")

    try:
        return await CreateStorefrontOrderUseCase(store_repo, product_repo, request_repo).execute(
            CreateStorefrontOrderInput(
                slug=slug,
                items=[StorefrontOrderLineInput(product_id=i.product_id, quantity=i.quantity) for i in dto.items],
                customer_name=dto.customer_name,
                customer_phone=dto.customer_phone,
                note=dto.note,
                delivery_method=dto.delivery_method,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
