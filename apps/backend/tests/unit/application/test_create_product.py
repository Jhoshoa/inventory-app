from decimal import Decimal
from uuid import uuid4

from src.application.use_cases.products.create_product import (
    CreateProductInput,
    CreateProductUseCase,
)


class MockProductRepo:
    async def qr_code_exists(self, qr_code, exclude_product_id=None):
        return False

    async def sku_exists(self, store_id, sku, exclude_product_id=None):
        return False

    async def product_name_exists(self, store_id, name, unit, exclude_product_id=None):
        return False

    async def save(self, product):
        return product


async def test_create_product_use_case():
    use_case = CreateProductUseCase(MockProductRepo())
    product = await use_case.execute(CreateProductInput(
        store_id=uuid4(),
        name="arroz 1kg",
        price=Decimal("12.50"),
        stock=50,
    ))
    assert product.name == "Arroz 1kg"
