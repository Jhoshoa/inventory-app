from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

STOREFRONT_REQUEST_STATUSES = ("pending", "contacted", "closed")
DELIVERY_METHODS = ("pickup", "delivery")


@dataclass
class StorefrontRequestItem:
    """Una linea de la boleta. Nombre, unidad y precio quedan copiados: el
    pedido se sigue leyendo igual aunque el producto cambie o se borre."""

    product_id: UUID | None
    product_name: str
    unit: str
    quantity: int
    unit_price: Decimal

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity


@dataclass
class StorefrontRequest:
    """Un cliente final pidiendo que la tienda lo contacte por un producto,
    desde el catalogo publico. No reserva stock real — es un "quiero esto,
    contactame", igual que hoy se maneja en persona/WhatsApp. `product_name`
    queda guardado aparte del producto para que la solicitud siga siendo
    legible aunque el producto se borre despues."""

    id: UUID
    store_id: UUID
    product_id: UUID | None
    product_name: str
    customer_name: str
    customer_phone: str
    note: str | None
    status: str
    payment_confirmed: bool
    created_at: datetime
    # Boleta (varios productos). Las solicitudes viejas de un solo producto no
    # tienen lineas ni total: se leen con product_name.
    items: list[StorefrontRequestItem] = field(default_factory=list)
    total: Decimal | None = None
    delivery_method: str | None = None

    @staticmethod
    def create(
        *,
        store_id: UUID,
        product_id: UUID,
        product_name: str,
        customer_name: str,
        customer_phone: str,
        note: str | None = None,
    ) -> "StorefrontRequest":
        return StorefrontRequest(
            id=uuid4(),
            store_id=store_id,
            product_id=product_id,
            product_name=product_name,
            customer_name=customer_name,
            customer_phone=customer_phone,
            note=note,
            status="pending",
            payment_confirmed=False,
            created_at=datetime.now(UTC),
        )

    @staticmethod
    def create_order(
        *,
        store_id: UUID,
        items: list[StorefrontRequestItem],
        customer_name: str,
        customer_phone: str,
        note: str | None = None,
        delivery_method: str | None = None,
    ) -> "StorefrontRequest":
        first = items[0]
        others = len(items) - 1
        summary = first.product_name if others == 0 else f"{first.product_name} y {others} mas"
        return StorefrontRequest(
            id=uuid4(),
            store_id=store_id,
            product_id=first.product_id,
            product_name=summary[:100],
            customer_name=customer_name,
            customer_phone=customer_phone,
            note=note,
            status="pending",
            payment_confirmed=False,
            created_at=datetime.now(UTC),
            items=items,
            total=sum((item.line_total for item in items), Decimal(0)),
            delivery_method=delivery_method,
        )
