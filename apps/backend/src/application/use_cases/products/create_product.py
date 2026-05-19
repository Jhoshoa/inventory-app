from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4
from src.application.exceptions import ConflictError
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
    unit: str = "unidad"
    sku: str | None = None
    cost_price: Decimal | None = None
    photo_url: str | None = None
    qr_code: str | None = None


class CreateProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, input: CreateProductInput) -> Product:
        qr_code = input.qr_code or self._generate_qr_code()
        if await self._repo.qr_code_exists(qr_code):
            raise ConflictError("El codigo QR ya esta en uso")

        product = Product.create(
            store_id=input.store_id,
            name=normalize_product_name(input.name),
            price=input.price,
            stock=input.stock,
            category=input.category,
            min_stock=input.min_stock,
            unit=input.unit,
            sku=input.sku,
            cost_price=input.cost_price,
            photo_url=input.photo_url,
            qr_code=qr_code,
        )
        return await self._repo.save(product)

    def _generate_qr_code(self) -> str:
        return f"P-{uuid4().hex[:12].upper()}"
