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
        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a cero")
        if unit_price < 0:
            raise ValueError("El precio unitario no puede ser negativo")
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
    device_id: str | None = None
    customer_name: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    voided_at: datetime | None = None
    void_reason: str | None = None

    @staticmethod
    def create(
        store_id: UUID,
        items: list[SaleItem],
        payment_method: str = "efectivo",
        device_id: str | None = None,
        customer_name: str | None = None,
    ) -> "Sale":
        if not items:
            raise ValueError("La venta debe tener al menos un producto")
        total = sum(item.subtotal for item in items)
        return Sale(
            id=uuid4(),
            store_id=store_id,
            items=items,
            total=total,
            payment_method=payment_method,
            device_id=device_id,
            customer_name=customer_name,
        )
