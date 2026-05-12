from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository
from src.application.exceptions import NotFoundError
from src.application.use_cases.products.name_normalizer import normalize_product_name


@dataclass
class UpdateProductInput:
    product_id: UUID
    name: str | None = None
    price: Decimal | None = None
    category: str | None = None
    min_stock: int | None = None


class UpdateProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, input: UpdateProductInput) -> Product:
        product = await self._repo.get_by_id(input.product_id)
        if not product:
            raise NotFoundError("Producto no encontrado")
        if input.name is not None:
            product.name = normalize_product_name(input.name)
        if input.price is not None:
            product.price = input.price
        if input.category is not None:
            product.category = input.category
        if input.min_stock is not None:
            product.min_stock = input.min_stock
        return await self._repo.save(product)
