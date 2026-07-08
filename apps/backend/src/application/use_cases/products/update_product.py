from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.products.name_normalizer import normalize_product_name
from src.domain.entities.product import Product
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.domain.repositories.product_repository import IProductRepository


@dataclass
class UpdateProductInput:
    store_id: UUID
    product_id: UUID
    name: str | None = None
    price: Decimal | None = None
    category_id: UUID | None = None
    category: str | None = None
    min_stock: int | None = None
    unit: str | None = None
    sku: str | None = None
    cost_price: Decimal | None = None
    photo_url: str | None = None
    qr_code: str | None = None


class UpdateProductUseCase:
    def __init__(self, repo: IProductRepository, category_repo: IProductCategoryRepository | None = None):
        self._repo = repo
        self._category_repo = category_repo

    async def execute(self, input: UpdateProductInput) -> Product:
        product = await self._repo.get_by_id(input.store_id, input.product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        if input.name is not None:
            product.name = normalize_product_name(input.name)

        if input.unit is not None:
            product.unit = input.unit

        if input.name is not None or input.unit is not None:
            if await self._repo.product_name_exists(
                input.store_id, product.name, product.unit, exclude_product_id=product.id
            ):
                raise ConflictError(f"Ya existe un producto con el nombre '{product.name}' y unidad '{product.unit}'")

        if input.price is not None:
            product.price = input.price
        if input.category_id is not None:
            if self._category_repo is None:
                raise NotFoundError("Categoria no encontrada")
            category = await self._category_repo.get_by_id(input.store_id, input.category_id)
            if category is None:
                raise NotFoundError("Categoria no encontrada")
            product.category_id = category.id
            product.category = category.name
        if input.category is not None:
            product.category = input.category
        if input.min_stock is not None:
            product.min_stock = input.min_stock

        if input.sku is not None:
            if await self._repo.sku_exists(input.store_id, input.sku, exclude_product_id=product.id):
                raise ConflictError("El SKU ya esta en uso por otro producto")
            product.sku = input.sku
        if input.cost_price is not None:
            product.cost_price = input.cost_price
        if input.photo_url is not None:
            product.photo_url = input.photo_url
        if input.qr_code is not None:
            if await self._repo.qr_code_exists(input.qr_code, exclude_product_id=product.id):
                raise ConflictError("El codigo escaneable ya esta en uso por otro producto")
            product.qr_code = input.qr_code
        return await self._repo.save(product)
