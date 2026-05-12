from uuid import UUID

from fastapi import APIRouter, Depends
from src.application.dto.product_dto import CreateProductDTO, ProductResponseDTO, UpdateProductDTO, StockAdjustmentDTO
from src.application.use_cases.products.create_product import CreateProductUseCase, CreateProductInput
from src.application.use_cases.products.list_products import ListProductsUseCase
from src.application.use_cases.products.get_product import GetProductUseCase
from src.application.use_cases.products.update_product import UpdateProductUseCase, UpdateProductInput
from src.application.use_cases.products.delete_product import DeleteProductUseCase
from src.application.use_cases.products.update_stock import UpdateStockUseCase
from src.application.exceptions import NotFoundError
from src.presentation.dependencies import get_current_user, get_product_repo
from src.infrastructure.database.repositories.product_repository import ProductRepository

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductResponseDTO])
async def list_products(
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = ListProductsUseCase(repo)
    products = await use_case.execute(user["store_id"])
    return products


@router.post("", response_model=ProductResponseDTO, status_code=201)
async def create_product(
    dto: CreateProductDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = CreateProductUseCase(repo)
    product = await use_case.execute(CreateProductInput(
        store_id=UUID(str(user["store_id"])),
        name=dto.name,
        price=dto.price,
        stock=dto.stock,
        category=dto.category,
        min_stock=dto.min_stock,
    ))
    return product


@router.get("/{product_id}", response_model=ProductResponseDTO)
async def get_product(
    product_id: UUID,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = GetProductUseCase(repo)
    product = await use_case.execute(product_id)
    if product.store_id != UUID(str(user["store_id"])):
        raise NotFoundError("Producto no encontrado")
    return product


@router.patch("/{product_id}", response_model=ProductResponseDTO)
async def update_product(
    product_id: UUID,
    dto: UpdateProductDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = UpdateProductUseCase(repo)
    existing = await GetProductUseCase(repo).execute(product_id)
    if existing.store_id != UUID(str(user["store_id"])):
        raise NotFoundError("Producto no encontrado")
    product = await use_case.execute(UpdateProductInput(
        product_id=product_id,
        name=dto.name,
        price=dto.price,
        category=dto.category,
        min_stock=dto.min_stock,
    ))
    if dto.stock is not None:
        product.stock = dto.stock
        product = await repo.save(product)
    return product


@router.patch("/{product_id}/stock", response_model=ProductResponseDTO)
async def adjust_stock(
    product_id: UUID,
    dto: StockAdjustmentDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    existing = await GetProductUseCase(repo).execute(product_id)
    if existing.store_id != UUID(str(user["store_id"])):
        raise NotFoundError("Producto no encontrado")
    use_case = UpdateStockUseCase(repo)
    return await use_case.execute(product_id, dto.quantity)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    existing = await GetProductUseCase(repo).execute(product_id)
    if existing.store_id != UUID(str(user["store_id"])):
        raise NotFoundError("Producto no encontrado")
    use_case = DeleteProductUseCase(repo)
    await use_case.execute(product_id)
