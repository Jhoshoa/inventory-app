from decimal import Decimal
from uuid import uuid4
from src.domain.entities.product import Product


def test_create_product():
    store_id = uuid4()
    product = Product.create(
        store_id=store_id,
        name="Arroz 1kg",
        price=Decimal("12.50"),
        stock=50,
    )
    assert product.name == "Arroz 1kg"
    assert product.price == Decimal("12.50")
    assert product.stock == 50
    assert product.can_sell(10) is True


def test_cannot_sell_if_insufficient_stock():
    product = Product(id=uuid4(), store_id=uuid4(), name="Test", price=Decimal("10"), stock=2)
    assert product.can_sell(5) is False


def test_reduce_stock():
    product = Product(id=uuid4(), store_id=uuid4(), name="Test", price=Decimal("10"), stock=10)
    product.reduce_stock(3)
    assert product.stock == 7
    assert product.version == 2


def test_cannot_reduce_below_zero():
    product = Product(id=uuid4(), store_id=uuid4(), name="Test", price=Decimal("10"), stock=2)
    try:
        product.reduce_stock(5)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass
