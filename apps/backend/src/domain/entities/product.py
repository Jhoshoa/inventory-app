from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Product:
    id: UUID
    store_id: UUID
    name: str
    price: Decimal
    stock: int
    min_stock: int = 5
    category: str | None = None
    sku: str | None = None
    unit: str = "unidad"
    photo_url: str | None = None
    qr_code: str | None = None
    cost_price: Decimal | None = None
    is_active: bool = True
    version: int = 1

    @staticmethod
    def create(store_id: UUID, name: str, price: Decimal, stock: int, **kwargs) -> "Product":
        return Product(
            id=uuid4(),
            store_id=store_id,
            name=name,
            price=price,
            stock=stock,
            **kwargs,
        )

    def can_sell(self, quantity: int) -> bool:
        return self.stock >= quantity and self.is_active

    def reduce_stock(self, quantity: int) -> None:
        if not self.can_sell(quantity):
            raise ValueError(f"Stock insuficiente: {self.stock} < {quantity}")
        self.stock -= quantity
        self.version += 1
