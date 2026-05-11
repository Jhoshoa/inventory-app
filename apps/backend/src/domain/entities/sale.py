from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID, uuid4
from datetime import datetime, timezone


@dataclass
class SaleItem:
    id: UUID
    product_id: UUID
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    @staticmethod
    def create(product_id: UUID, product_name: str, quantity: int, unit_price: Decimal) -> "SaleItem":
        return SaleItem(
            id=uuid4(),
            product_id=product_id,
            product_name=product_name,
            quantity=quantity,
            unit_price=unit_price,
            subtotal=unit_price * quantity,
        )


@dataclass
class Sale:
    id: UUID
    store_id: UUID
    items: list[SaleItem] = field(default_factory=list)
    total: Decimal = Decimal("0")
    payment_method: str = "efectivo"
    status: str = "completed"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(store_id: UUID, items: list[SaleItem], payment_method: str = "efectivo") -> "Sale":
        total = sum(item.subtotal for item in items)
        return Sale(
            id=uuid4(),
            store_id=store_id,
            items=items,
            total=total,
            payment_method=payment_method,
        )
