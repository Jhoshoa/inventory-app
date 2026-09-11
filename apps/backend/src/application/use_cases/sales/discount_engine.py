from decimal import Decimal

from src.application.exceptions import ForbiddenError
from src.domain.entities.store import Store

DISCOUNT_SOURCES = ("auto", "product", "manual", "none")
MANUAL_DISCOUNT_TYPES = ("percentage", "fixed")


def validate_discount_against_policy(
    store: Store,
    discount_type: str | None,
    discount_value: Decimal,
) -> None:
    """Valida un descuento contra la politica de la tienda, sin importar su
    origen (rebaja manual del cajero al cobrar, o descuento fijado por el
    owner directamente en el catalogo de un producto). Es una sola politica:
    "cuanto descuento da esta tienda, como maximo" — no debe poder saltearse
    poniendo el numero en el producto en vez de en el checkout."""
    if discount_type is None:
        return

    if discount_type == "percentage":
        if not store.allow_percentage_discount:
            raise ForbiddenError("El descuento por porcentaje no esta habilitado para esta tienda")
        if discount_value > store.max_percentage_discount:
            raise ForbiddenError(f"El descuento maximo permitido es {store.max_percentage_discount}%")
    elif discount_type == "fixed":
        if not store.allow_manual_discount:
            raise ForbiddenError("La rebaja manual no esta habilitada para esta tienda")
        if discount_value > store.max_manual_discount_amount:
            raise ForbiddenError(f"La rebaja maxima permitida es Bs. {store.max_manual_discount_amount}")
    else:
        raise ValueError("Tipo de descuento invalido")


def compute_manual_discount_amount(
    store: Store,
    discount_type: str | None,
    discount_value: Decimal,
    subtotal: Decimal,
) -> Decimal:
    """Valida y calcula el monto de la rebaja manual pedida por el cajero,
    contra la politica de descuentos configurada por el owner de la tienda."""
    if discount_type is None:
        return Decimal(0)

    validate_discount_against_policy(store, discount_type, discount_value)
    if discount_type == "percentage":
        amount = (subtotal * discount_value / Decimal(100)).quantize(Decimal("0.01"))
    else:
        amount = discount_value

    return min(amount, subtotal)


def resolve_discount(
    *,
    store_allows_override: bool,
    override: str | None,
    product_discount_amount: Decimal,
    manual_discount_type: str | None,
    manual_discount_value: Decimal,
    manual_discount_amount: Decimal,
) -> tuple[str | None, Decimal]:
    """Decide cual descuento se aplica a la venta: el propio de cada producto
    (configurado por el owner en el catalogo) o el manual que pide el cajero al
    cobrar. Nunca se aplican ambos a la vez. Por defecto gana el que resulte en
    mayor ahorro para el cliente; en empate se prefiere el manual, por ser la
    eleccion activa del cajero. El cajero solo puede elegir una fuente distinta
    a la automatica si el owner habilito `allow_cashier_discount_override`."""
    if override is not None and override not in DISCOUNT_SOURCES:
        raise ValueError("Fuente de descuento invalida")

    if store_allows_override and override and override != "auto":
        if override == "manual":
            if manual_discount_type is None:
                raise ValueError("Debes indicar un descuento manual para poder aplicarlo")
            return manual_discount_type, manual_discount_value
        if override == "product":
            if product_discount_amount <= 0:
                return None, Decimal(0)
            return "product", product_discount_amount
        if override == "none":
            return None, Decimal(0)

    if product_discount_amount > manual_discount_amount and product_discount_amount > 0:
        return "product", product_discount_amount
    if manual_discount_amount > 0:
        return manual_discount_type, manual_discount_value
    return None, Decimal(0)
