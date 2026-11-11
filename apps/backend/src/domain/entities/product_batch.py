from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

DEFAULT_ALERT_DAYS = 5
MAX_ALERT_DAYS = 365
# Fuera de este rango es casi seguro un error de tipeo (p. ej. 2205).
MIN_EXPIRY_YEAR = 2000
MAX_EXPIRY_YEAR = 2100


class BatchStatus(StrEnum):
    OK = "ok"
    EXPIRING = "expiring"
    EXPIRED = "expired"
    DEPLETED = "depleted"


@dataclass(frozen=True)
class NewBatch:
    """Datos del lote que entra con un ingreso de stock."""

    expires_on: date
    alert_days: int = DEFAULT_ALERT_DAYS

    def __post_init__(self) -> None:
        if not 0 <= self.alert_days <= MAX_ALERT_DAYS:
            raise ValueError(f"El aviso debe estar entre 0 y {MAX_ALERT_DAYS} dias")
        if not MIN_EXPIRY_YEAR <= self.expires_on.year <= MAX_EXPIRY_YEAR:
            raise ValueError("La fecha de vencimiento no es valida")


@dataclass
class ProductBatch:
    id: UUID
    store_id: UUID
    product_id: UUID
    expires_on: date
    alert_days: int
    quantity_initial: int
    quantity_remaining: int
    created_at: datetime
    product_name: str | None = None
    product_unit: str | None = None

    def days_left(self, today: date) -> int:
        return (self.expires_on - today).days

    def status(self, today: date) -> BatchStatus:
        if self.quantity_remaining <= 0:
            return BatchStatus.DEPLETED
        days = self.days_left(today)
        if days < 0:
            return BatchStatus.EXPIRED
        if days <= self.alert_days:
            return BatchStatus.EXPIRING
        return BatchStatus.OK
