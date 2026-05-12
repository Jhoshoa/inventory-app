from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository
from src.application.use_cases.products.name_normalizer import normalize_product_name


@dataclass
class CreateProductInput:
    store_id: UUID
    name: str
    price: Decimal
    stock: int
    category: str | None = None
    min_stock: int = 5


class CreateProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, input: CreateProductInput) -> Product:
        product = Product.create(
            store_id=input.store_id,
            name=normalize_product_name(input.name),
            price=input.price,
            stock=input.stock,
            category=input.category,
            min_stock=input.min_stock,
        )
        return await self._repo.save(product)
