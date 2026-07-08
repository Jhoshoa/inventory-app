from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4

from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.products.name_normalizer import normalize_product_name
from src.domain.entities.product import Product
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.domain.repositories.product_repository import IProductRepository


@dataclass
class CreateProductInput:
    store_id: UUID
    name: str
    price: Decimal
    stock: int
    category_id: UUID | None = None
    category: str | None = None
    min_stock: int = 1
    unit: str = "unidad"
    sku: str | None = None
    cost_price: Decimal | None = None
    photo_url: str | None = None
    qr_code: str | None = None


class CreateProductUseCase:
    def __init__(self, repo: IProductRepository, category_repo: IProductCategoryRepository | None = None):
        self._repo = repo
        self._category_repo = category_repo

    async def execute(self, input: CreateProductInput) -> Product:
        category_name = input.category
        sku = input.sku
        if input.category_id is not None:
            if self._category_repo is None:
                raise NotFoundError("Categoria no encontrada")
            category = await self._category_repo.get_by_id(input.store_id, input.category_id)
            if category is None or not category.is_active:
                raise NotFoundError("Categoria no encontrada")
            category_name = category.name
            if not sku:
                sku = await self._category_repo.reserve_next_sku(input.store_id, input.category_id)
                if sku is None:
                    raise NotFoundError("Categoria no encontrada")

        if sku and await self._repo.sku_exists(input.store_id, sku):
            raise ConflictError("El SKU ya esta en uso por otro producto")

        if await self._repo.product_name_exists(input.store_id, normalize_product_name(input.name), input.unit):
            raise ConflictError(f"Ya existe un producto con el nombre '{input.name}' y unidad '{input.unit}'")

        qr_code = input.qr_code
        if not qr_code:
            qr_code = self._generate_qr_code(sku)
        if await self._repo.qr_code_exists(qr_code):
            raise ConflictError("El codigo escaneable ya esta en uso por otro producto")

        product = Product.create(
            store_id=input.store_id,
            name=normalize_product_name(input.name),
            price=input.price,
            stock=input.stock,
            category_id=input.category_id,
            category=category_name,
            min_stock=input.min_stock,
            unit=input.unit,
            sku=sku,
            cost_price=input.cost_price,
            photo_url=input.photo_url,
            qr_code=qr_code,
        )
        return await self._repo.save(product)

    def _generate_qr_code(self, sku: str | None) -> str:
        if sku:
            return f"QR-{sku}"
        return f"P-{uuid4().hex[:12].upper()}"
