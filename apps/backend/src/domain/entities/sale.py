from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID, uuid4

DISCOUNT_TYPES = ("percentage", "fixed", "product")


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
    subtotal: Decimal = Decimal(0)
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)
    discount_amount: Decimal = Decimal(0)
    total: Decimal = Decimal(0)
    payment_method: str = "efectivo"
    status: str = "completed"
    business_day_id: UUID | None = None
    business_date: date | None = None
    created_by_user_id: UUID | None = None
    device_id: str | None = None
    customer_name: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    voided_at: datetime | None = None
    void_reason: str | None = None

    @staticmethod
    def create(
        store_id: UUID,
        items: list[SaleItem],
        payment_method: str = "efectivo",
        business_day_id: UUID | None = None,
        business_date: date | None = None,
        created_by_user_id: UUID | None = None,
        device_id: str | None = None,
        customer_name: str | None = None,
        discount_type: str | None = None,
        discount_value: Decimal = Decimal(0),
        id: UUID | None = None,
        created_at: datetime | None = None,
    ) -> "Sale":
        if not items:
            raise ValueError("La venta debe tener al menos un producto")

        subtotal = sum((item.subtotal for item in items), Decimal(0))
        discount_amount = Decimal(0)

        if discount_type is not None:
            if discount_type not in DISCOUNT_TYPES:
                raise ValueError("Tipo de descuento invalido")
            if discount_value < 0:
                raise ValueError("El descuento no puede ser negativo")

            if discount_type == "percentage":
                if discount_value > 100:
                    raise ValueError("El porcentaje de descuento no puede superar 100%")
                discount_amount = (subtotal * discount_value / Decimal(100)).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
            else:
                discount_amount = discount_value

            # Nunca dejar el total en negativo aunque la rebaja manual supere el subtotal.
            discount_amount = min(discount_amount, subtotal)

        total = subtotal - discount_amount

        sale_kwargs = {}
        if created_at is not None:
            sale_kwargs["created_at"] = created_at

        return Sale(
            id=id or uuid4(),
            store_id=store_id,
            items=items,
            subtotal=subtotal,
            discount_type=discount_type,
            discount_value=discount_value if discount_type is not None else Decimal(0),
            discount_amount=discount_amount,
            total=total,
            payment_method=payment_method,
            business_day_id=business_day_id,
            business_date=business_date,
            created_by_user_id=created_by_user_id,
            device_id=device_id,
            customer_name=customer_name,
            **sale_kwargs,
        )
