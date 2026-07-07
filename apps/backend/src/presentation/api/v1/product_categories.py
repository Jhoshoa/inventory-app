from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.product_category_dto import (
    CreateProductCategoryDTO,
    ProductCategoryListResponseDTO,
    ProductCategoryResponseDTO,
    UpdateProductCategoryDTO,
)
from src.application.use_cases.auth.get_current_user_context import CurrentUserContext
from src.application.use_cases.product_categories.create_product_category import (
    CreateProductCategoryInput,
    CreateProductCategoryUseCase,
)
from src.application.use_cases.product_categories.deactivate_product_category import (
    DeactivateProductCategoryInput,
    DeactivateProductCategoryUseCase,
)
from src.application.use_cases.product_categories.list_product_categories import (
    ListProductCategoriesInput,
    ListProductCategoriesUseCase,
)
from src.application.use_cases.product_categories.update_product_category import (
    UpdateProductCategoryInput,
    UpdateProductCategoryUseCase,
)
from src.infrastructure.database.repositories.product_category_repository import (
    ProductCategoryRepository,
)
from src.presentation.dependencies import get_product_category_repo, require_owner

router = APIRouter(prefix="/product-categories", tags=["product-categories"])


@router.get("", response_model=ProductCategoryListResponseDTO)
async def list_product_categories(
    include_inactive: bool = Query(default=False),
    user: CurrentUserContext = Depends(require_owner),
    repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    return await ListProductCategoriesUseCase(repo).execute(
        ListProductCategoriesInput(store_id=UUID(str(user.store_id)), include_inactive=include_inactive)
    )


@router.post("", response_model=ProductCategoryResponseDTO, status_code=201)
async def create_product_category(
    dto: CreateProductCategoryDTO,
    user: CurrentUserContext = Depends(require_owner),
    repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    return await CreateProductCategoryUseCase(repo).execute(
        CreateProductCategoryInput(
            store_id=UUID(str(user.store_id)),
            name=dto.name,
            sku_prefix=dto.sku_prefix,
        )
    )


@router.patch("/{category_id}", response_model=ProductCategoryResponseDTO)
async def update_product_category(
    category_id: UUID,
    dto: UpdateProductCategoryDTO,
    user: CurrentUserContext = Depends(require_owner),
    repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    return await UpdateProductCategoryUseCase(repo).execute(
        UpdateProductCategoryInput(
            store_id=UUID(str(user.store_id)),
            category_id=category_id,
            name=dto.name,
            sku_prefix=dto.sku_prefix,
        )
    )


@router.post("/{category_id}/deactivate", response_model=ProductCategoryResponseDTO)
async def deactivate_product_category(
    category_id: UUID,
    user: CurrentUserContext = Depends(require_owner),
    repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    return await DeactivateProductCategoryUseCase(repo).execute(
        DeactivateProductCategoryInput(store_id=UUID(str(user.store_id)), category_id=category_id)
    )
