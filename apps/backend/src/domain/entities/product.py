from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID, uuid4

PRODUCT_DISCOUNT_TYPES = ("percentage", "fixed")


def is_discount_expired(discount_ends_at: datetime | None, now: datetime | None = None) -> bool:
    """Un descuento sin fecha de vencimiento nunca expira."""
    if discount_ends_at is None:
        return False
    if now is None:
        now = datetime.now(timezone.utc)
    return discount_ends_at <= now


def product_discount_per_unit(
    price: Decimal,
    discount_type: str | None,
    discount_value: Decimal,
    discount_ends_at: datetime | None = None,
    now: datetime | None = None,
) -> Decimal:
    """Cuanto se descuenta del precio de lista por cada unidad vendida.

    Funcion pura para poder reutilizarla donde solo se tienen columnas
    crudas (p. ej. sincronizacion offline) sin instanciar un `Product`.
    """
    if discount_type is not None and is_discount_expired(discount_ends_at, now):
        return Decimal(0)
    if discount_type == "percentage":
        amount = (price * discount_value / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return min(amount, price)
    if discount_type == "fixed":
        return min(discount_value, price)
    return Decimal(0)


@dataclass
class Product:
    id: UUID
    store_id: UUID
    name: str
    price: Decimal
    stock: int
    min_stock: int = 1
    category_id: UUID | None = None
    category: str | None = None
    sku: str | None = None
    unit: str = "unidad"
    photo_url: str | None = None
    qr_code: str | None = None
    cost_price: Decimal | None = None
    is_active: bool = True
    version: int = 1
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)
    discount_ends_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("El nombre del producto es requerido")
        if self.price < 0:
            raise ValueError("El precio no puede ser negativo")
        if self.stock < 0:
            raise ValueError("El stock no puede ser negativo")
        if self.min_stock < 0:
            raise ValueError("El stock minimo no puede ser negativo")
        self._validate_discount()

    def _validate_discount(self) -> None:
        if self.discount_type is None:
            return
        if self.discount_type not in PRODUCT_DISCOUNT_TYPES:
            raise ValueError("Tipo de descuento de producto invalido")
        if self.discount_value < 0:
            raise ValueError("El descuento del producto no puede ser negativo")
        if self.discount_type == "percentage" and self.discount_value > 100:
            raise ValueError("El porcentaje de descuento del producto no puede superar 100%")

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
        if quantity <= 0:
            return False
        return self.stock >= quantity and self.is_active

    def reduce_stock(self, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a cero")
        if not self.can_sell(quantity):
            raise ValueError(f"Stock insuficiente: {self.stock} < {quantity}")
        self.stock -= quantity
        self.version += 1

    def adjust_stock(self, quantity: int) -> None:
        if self.stock + quantity < 0:
            raise ValueError(f"Stock insuficiente: {self.stock} < {abs(quantity)}")
        self.stock += quantity
        self.version += 1

    @property
    def is_discount_active(self) -> bool:
        """Si el producto tiene un descuento configurado y no vencido."""
        return self.discount_type is not None and not is_discount_expired(self.discount_ends_at)

    @property
    def discount_per_unit(self) -> Decimal:
        """Cuanto se descuenta del precio de lista por cada unidad vendida."""
        return product_discount_per_unit(self.price, self.discount_type, self.discount_value, self.discount_ends_at)

    @property
    def effective_price(self) -> Decimal:
        """Precio final por unidad despues de su descuento propio (nunca negativo)."""
        return self.price - self.discount_per_unit
