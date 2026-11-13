from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from src.application.exceptions import ApplicationError, ConflictError, NotFoundError
from src.application.use_cases.products.code_rules import (
    free_product_code,
    normalize_product_code,
    product_code_error,
)
from src.application.use_cases.products.name_normalizer import normalize_product_name
from src.application.use_cases.sales.discount_engine import (
    validate_discount_against_policy,
)
from src.domain.entities.product import Product
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.store_repository import IStoreRepository


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
    discount_type: str | None = None
    discount_value: Decimal | None = None
    remove_discount: bool = False
    discount_ends_at: datetime | None = None
    clear_discount_ends_at: bool = False


class UpdateProductUseCase:
    def __init__(
        self,
        repo: IProductRepository,
        category_repo: IProductCategoryRepository | None = None,
        store_repo: IStoreRepository | None = None,
    ):
        self._repo = repo
        self._category_repo = category_repo
        self._store_repo = store_repo

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
            # El formato se revisa solo si cambia: un SKU viejo que no lo cumple no impide editar.
            unchanged_sku = input.sku.strip() == (product.sku or "")
            sku = product.sku if unchanged_sku else normalize_product_code(input.sku)
            if not unchanged_sku:
                message = product_code_error(sku)
                if message:
                    raise ApplicationError(f"SKU: {message}", {"field": "sku"})
                if sku and await self._repo.sku_exists(input.store_id, sku, exclude_product_id=product.id):
                    raise ConflictError("El SKU ya esta en uso por otro producto")
            product.sku = sku
        if input.cost_price is not None:
            product.cost_price = input.cost_price
        if input.photo_url is not None:
            product.photo_url = input.photo_url
        if input.qr_code is not None:
            # Igual que el SKU: el codigo que ya tenia (aunque sea de antes de la regla) se deja.
            unchanged_code = bool(product.qr_code) and input.qr_code.strip() == product.qr_code
            if not unchanged_code:
                qr_code = normalize_product_code(input.qr_code)
                if qr_code is None:
                    # Vaciarlo crea uno automatico, como al crear (un producto siempre se puede escanear).
                    qr_code = await free_product_code(
                        product.sku,
                        lambda code: self._repo.qr_code_exists(input.store_id, code, exclude_product_id=product.id),
                    )
                elif qr_code != product.qr_code:
                    message = product_code_error(qr_code)
                    if message:
                        raise ApplicationError(f"Codigo para escanear: {message}", {"field": "qr_code"})
                    if await self._repo.qr_code_exists(input.store_id, qr_code, exclude_product_id=product.id):
                        raise ConflictError("El codigo escaneable ya esta en uso por otro producto")
                product.qr_code = qr_code

        if input.remove_discount:
            product.discount_type = None
            product.discount_value = Decimal(0)
            product.discount_ends_at = None
        elif input.discount_type is not None:
            discount_value = input.discount_value if input.discount_value is not None else Decimal(0)
            if self._store_repo is None:
                raise NotFoundError("Tienda no encontrada")
            store = await self._store_repo.get_by_id(input.store_id)
            if store is None:
                raise NotFoundError("Tienda no encontrada")
            validate_discount_against_policy(store, input.discount_type, discount_value)
            product.discount_type = input.discount_type
            product.discount_value = discount_value
            product.discount_ends_at = input.discount_ends_at
        elif input.clear_discount_ends_at:
            product.discount_ends_at = None
        elif input.discount_ends_at is not None:
            if product.discount_type is None:
                raise ApplicationError("El producto no tiene un descuento activo para fijarle vencimiento")
            product.discount_ends_at = input.discount_ends_at

        return await self._repo.save(product)
