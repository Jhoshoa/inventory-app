import re
from collections.abc import Awaitable, Callable
from uuid import uuid4

# Codigo para escanear y SKU: letras A-Z, numeros y guion, hasta 50. Se guardan en
# mayusculas y sin espacios alrededor, asi "abc-1" y "ABC-1" son el mismo codigo.
PRODUCT_CODE_MAX = 50
_PRODUCT_CODE = re.compile(r"^[A-Z0-9-]+$")
CODE_FORMAT_MESSAGE = f"Usa solo letras A-Z, numeros y guion (maximo {PRODUCT_CODE_MAX})"

# Si el codigo armado desde el SKU ya lo usa otro producto de la tienda (p. ej. alguien
# lo escribio a mano), se prueba con un sufijo y al final uno al azar.
_MAX_ATTEMPTS = 20


def normalize_product_code(value: str | None) -> str | None:
    """Mayusculas y sin espacios alrededor; vacio = None."""
    if value is None:
        return None
    cleaned = value.strip().upper()
    return cleaned or None


def product_code_error(value: str | None) -> str | None:
    """None si el codigo (ya normalizado) sirve; si no, el mensaje."""
    if value is None:
        return None
    if len(value) > PRODUCT_CODE_MAX or not _PRODUCT_CODE.match(value):
        return CODE_FORMAT_MESSAGE
    return None


def random_product_code() -> str:
    return f"P-{uuid4().hex[:12].upper()}"


async def free_product_code(sku: str | None, is_taken: Callable[[str], Awaitable[bool]]) -> str:
    """Codigo automatico libre en la tienda: QR-{SKU}, QR-{SKU}-2, ... o uno al azar."""
    if sku:
        base = f"QR-{sku}"
        for attempt in range(_MAX_ATTEMPTS):
            candidate = base if attempt == 0 else f"{base}-{attempt + 1}"
            if len(candidate) <= PRODUCT_CODE_MAX and not await is_taken(candidate):
                return candidate
    while True:
        candidate = random_product_code()
        if not await is_taken(candidate):
            return candidate
