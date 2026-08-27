from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

STOREFRONT_REQUEST_STATUSES = ("pending", "contacted", "closed")


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
