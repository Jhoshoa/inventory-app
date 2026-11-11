from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID, uuid4

ZONE_MAX_LENGTH = 50
SHELF_MAX_LENGTH = 50
LEVEL_MAX_LENGTH = 30
# Un producto suele estar en exhibicion y en deposito; mas de esto es ruido.
MAX_LOCATIONS_PER_PRODUCT = 6


class ProductLocationKind(StrEnum):
    DISPLAY = "display"
    STORAGE = "storage"


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


@dataclass
class StoreLocation:
    """Lugar de la tienda: Zona -> Mueble/Estante -> Nivel (los dos ultimos opcionales)."""

    id: UUID
    store_id: UUID
    zone: str
    shelf: str | None = None
    level: str | None = None
    product_count: int = 0

    def __post_init__(self) -> None:
        self.zone = _clean(self.zone) or ""
        self.shelf = _clean(self.shelf)
        self.level = _clean(self.level)
        if not self.zone:
            raise ValueError("La zona es requerida")
        if len(self.zone) > ZONE_MAX_LENGTH:
            raise ValueError(f"La zona no puede superar {ZONE_MAX_LENGTH} caracteres")
        if self.shelf and len(self.shelf) > SHELF_MAX_LENGTH:
            raise ValueError(f"El mueble no puede superar {SHELF_MAX_LENGTH} caracteres")
        if self.level and len(self.level) > LEVEL_MAX_LENGTH:
            raise ValueError(f"El nivel no puede superar {LEVEL_MAX_LENGTH} caracteres")
        if self.level and not self.shelf:
            raise ValueError("Para indicar un nivel primero indica el mueble o estante")

    @staticmethod
    def create(*, store_id: UUID, zone: str, shelf: str | None = None, level: str | None = None) -> "StoreLocation":
        return StoreLocation(id=uuid4(), store_id=store_id, zone=zone, shelf=shelf, level=level)

    @property
    def label(self) -> str:
        return " · ".join(part for part in (self.zone, self.shelf, self.level) if part)

    def key(self) -> tuple[str, str, str]:
        """Para detectar duplicados sin importar mayusculas ni espacios."""
        return (self.zone.casefold(), (self.shelf or "").casefold(), (self.level or "").casefold())


@dataclass(frozen=True)
class ProductLocation:
    location: StoreLocation
    kind: ProductLocationKind
