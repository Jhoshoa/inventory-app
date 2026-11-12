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
from src.domain.entities.product_batch import NewBatch
from src.domain.repositories.product_batch_repository import IProductBatchRepository
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.store_repository import IStoreRepository


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
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)
    discount_ends_at: datetime | None = None
    # El stock inicial entra como un lote con esta fecha de vencimiento.
    initial_batch: NewBatch | None = None


class CreateProductUseCase:
    def __init__(
        self,
        repo: IProductRepository,
        category_repo: IProductCategoryRepository | None = None,
        store_repo: IStoreRepository | None = None,
        batch_repo: IProductBatchRepository | None = None,
    ):
        self._repo = repo
        self._category_repo = category_repo
        self._store_repo = store_repo
        self._batch_repo = batch_repo

    async def execute(self, input: CreateProductInput) -> Product:
        if input.initial_batch is not None and (input.stock <= 0 or self._batch_repo is None):
            raise ValueError("La fecha de vencimiento necesita un stock inicial mayor a cero")
        if input.discount_type is not None:
            if self._store_repo is None:
                raise NotFoundError("Tienda no encontrada")
            store = await self._store_repo.get_by_id(input.store_id)
            if store is None:
                raise NotFoundError("Tienda no encontrada")
            validate_discount_against_policy(store, input.discount_type, input.discount_value)

        sku = normalize_product_code(input.sku)
        qr_code = normalize_product_code(input.qr_code)
        for field, label, value in (("sku", "SKU", sku), ("qr_code", "Codigo para escanear", qr_code)):
            message = product_code_error(value)
            if message:
                raise ApplicationError(f"{label}: {message}", {"field": field})

        category_name = input.category
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

        # El codigo es unico en la tienda (no entre tiendas): el automatico busca uno libre.
        if qr_code:
            if await self._repo.qr_code_exists(input.store_id, qr_code):
                raise ConflictError("El codigo escaneable ya esta en uso por otro producto")
        else:
            qr_code = await free_product_code(sku, lambda code: self._repo.qr_code_exists(input.store_id, code))

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
            discount_type=input.discount_type,
            discount_value=input.discount_value,
            discount_ends_at=input.discount_ends_at if input.discount_type is not None else None,
        )
        saved = await self._repo.save(product)
        if input.initial_batch is not None and self._batch_repo is not None:
            await self._batch_repo.add(input.store_id, saved.id, saved.stock, input.initial_batch)
        return saved
