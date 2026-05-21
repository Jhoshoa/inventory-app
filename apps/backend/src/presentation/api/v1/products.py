from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.product_dto import (
    CreateProductDTO,
    ProductCompactListResponseDTO,
    ProductCompactResponseDTO,
    ProductListResponseDTO,
    ProductResponseDTO,
    ProductSortField,
    ProductStockFilter,
    SortDirection,
    StockAdjustmentDTO,
    UpdateProductDTO,
)
from src.application.dto.stock_movement_dto import StockMovementListResponseDTO
from src.application.use_cases.products.create_product import CreateProductInput, CreateProductUseCase
from src.application.use_cases.products.delete_product import DeleteProductUseCase
from src.application.use_cases.products.get_product import GetProductUseCase
from src.application.use_cases.products.get_product_by_qr import GetProductByQRUseCase
from src.application.use_cases.products.list_low_stock_products import ListLowStockProductsUseCase
from src.application.use_cases.products.search_products import SearchProductsInput, SearchProductsUseCase
from src.application.use_cases.products.update_product import UpdateProductInput, UpdateProductUseCase
from src.application.use_cases.products.update_stock import UpdateStockUseCase
from src.application.use_cases.stock_movements.list_product_stock_movements import (
    ListProductStockMovementsInput,
    ListProductStockMovementsUseCase,
)
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.stock_movement_repository import StockMovementRepository
from src.presentation.dependencies import get_current_user, get_product_repo, get_stock_movement_repo, require_active_user, require_owner

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponseDTO)
async def list_products(
    q: str | None = Query(default=None, min_length=3, max_length=100),
    category: str | None = Query(default=None, max_length=50),
    stock: ProductStockFilter = ProductStockFilter.ALL,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort: ProductSortField = ProductSortField.NAME,
    direction: SortDirection = SortDirection.ASC,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    products, total = await SearchProductsUseCase(repo).execute(
        SearchProductsInput(
            store_id=UUID(str(user["store_id"])),
            q=q,
            category=category,
            stock=stock.value,
            limit=limit,
            offset=offset,
            sort=sort.value,
            direction=direction.value,
        )
    )
    return ProductListResponseDTO(items=products, total=total, limit=limit, offset=offset)


@router.get("/pos", response_model=ProductCompactListResponseDTO)
async def list_products_for_pos(
    q: str | None = Query(default=None, min_length=3, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    products, total = await SearchProductsUseCase(repo).execute(
        SearchProductsInput(
            store_id=UUID(str(user["store_id"])),
            q=q,
            limit=limit,
            offset=offset,
            sort="name",
            direction="asc",
        )
    )
    return ProductCompactListResponseDTO(
        items=[
            ProductCompactResponseDTO(
                id=product.id,
                name=product.name,
                price=product.price,
                stock=product.stock,
                unit=product.unit,
                qr_code=product.qr_code,
            )
            for product in products
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/low-stock", response_model=list[ProductResponseDTO])
async def list_low_stock_products(
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await ListLowStockProductsUseCase(repo).execute(UUID(str(user["store_id"])), limit)


@router.get("/qr/{qr_code}", response_model=ProductResponseDTO)
async def get_product_by_qr(
    qr_code: str,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await GetProductByQRUseCase(repo).execute(UUID(str(user["store_id"])), qr_code)


@router.get("/{product_id}/stock-movements", response_model=StockMovementListResponseDTO)
async def list_product_stock_movements(
    product_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_active_user),
    product_repo: ProductRepository = Depends(get_product_repo),
    movement_repo: StockMovementRepository = Depends(get_stock_movement_repo),
):
    movements, total = await ListProductStockMovementsUseCase(movement_repo, product_repo).execute(
        ListProductStockMovementsInput(
            store_id=user.store_id,
            product_id=product_id,
            limit=limit,
            offset=offset,
        )
    )
    return StockMovementListResponseDTO(items=movements, total=total, limit=limit, offset=offset)


@router.post("", response_model=ProductResponseDTO, status_code=201)
async def create_product(
    dto: CreateProductDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    product = await CreateProductUseCase(repo).execute(
        CreateProductInput(
            store_id=UUID(str(user["store_id"])),
            name=dto.name,
            price=dto.price,
            stock=dto.stock,
            category=dto.category,
            min_stock=dto.min_stock,
            unit=dto.unit,
            sku=dto.sku,
            cost_price=dto.cost_price,
            photo_url=dto.photo_url,
            qr_code=dto.qr_code,
        )
    )
    return product


@router.get("/{product_id}", response_model=ProductResponseDTO)
async def get_product(
    product_id: UUID,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await GetProductUseCase(repo).execute(UUID(str(user["store_id"])), product_id)


@router.patch("/{product_id}", response_model=ProductResponseDTO)
async def update_product(
    product_id: UUID,
    dto: UpdateProductDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    product = await UpdateProductUseCase(repo).execute(
        UpdateProductInput(
            store_id=UUID(str(user["store_id"])),
            product_id=product_id,
            name=dto.name,
            price=dto.price,
            category=dto.category,
            min_stock=dto.min_stock,
            unit=dto.unit,
            sku=dto.sku,
            cost_price=dto.cost_price,
            photo_url=dto.photo_url,
            qr_code=dto.qr_code,
        )
    )
    if dto.stock is not None:
        delta = dto.stock - product.stock
        if delta:
            product = await UpdateStockUseCase(repo).execute(
                UUID(str(user["store_id"])),
                product_id,
                delta,
                "stock set from product update",
            )
    return product


@router.patch("/{product_id}/stock", response_model=ProductResponseDTO)
async def adjust_stock(
    product_id: UUID,
    dto: StockAdjustmentDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await UpdateStockUseCase(repo).execute(UUID(str(user["store_id"])), product_id, dto.quantity, dto.reason)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
):
    await DeleteProductUseCase(repo).execute(UUID(str(user["store_id"])), product_id)
