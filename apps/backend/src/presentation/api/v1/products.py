from fastapi import APIRouter, Depends
from src.application.dto.product_dto import CreateProductDTO, ProductResponseDTO
from src.application.use_cases.products.create_product import CreateProductUseCase, CreateProductInput
from src.application.use_cases.products.list_products import ListProductsUseCase
from src.application.use_cases.products.get_product import GetProductUseCase
from src.application.use_cases.products.update_product import UpdateProductUseCase, UpdateProductInput
from src.application.use_cases.products.delete_product import DeleteProductUseCase
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
        store_id=user["store_id"],
        name=dto.name,
        price=dto.price,
        stock=dto.stock,
        category=dto.category,
        min_stock=dto.min_stock,
    ))
    return product


@router.get("/{product_id}", response_model=ProductResponseDTO)
async def get_product(
    product_id: str,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = GetProductUseCase(repo)
    return await use_case.execute(product_id)


@router.patch("/{product_id}", response_model=ProductResponseDTO)
async def update_product(
    product_id: str,
    dto: CreateProductDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = UpdateProductUseCase(repo)
    product = await use_case.execute(UpdateProductInput(
        product_id=product_id,
        name=dto.name,
        price=dto.price,
        category=dto.category,
    ))
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = DeleteProductUseCase(repo)
    await use_case.execute(product_id)
