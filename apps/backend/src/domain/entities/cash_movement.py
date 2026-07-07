from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

CASH_MOVEMENT_TYPES = {"cash_in", "cash_out", "expense", "deposit", "withdrawal"}
CASH_MOVEMENT_OUT_TYPES = {"cash_out", "expense", "deposit", "withdrawal"}


@dataclass
class CashMovement:
    id: UUID
    store_id: UUID
    business_day_id: UUID
    movement_type: str
    amount: Decimal
    created_by_user_id: UUID
    note: str | None = None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    voided_at: datetime | None = None
    voided_by_user_id: UUID | None = None
    void_reason: str | None = None

    @staticmethod
    def create(
        *,
        store_id: UUID,
        business_day_id: UUID,
        movement_type: str,
        amount: Decimal,
        created_by_user_id: UUID,
        note: str | None = None,
    ) -> "CashMovement":
        if movement_type not in CASH_MOVEMENT_TYPES:
            raise ValueError("Tipo de movimiento de caja no valido")
        if amount <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        now = datetime.now(timezone.utc)
        return CashMovement(
            id=uuid4(),
            store_id=store_id,
            business_day_id=business_day_id,
            movement_type=movement_type,
            amount=amount,
            created_by_user_id=created_by_user_id,
            note=note,
            occurred_at=now,
            created_at=now,
        )

    @property
    def direction(self) -> str:
        return "out" if self.movement_type in CASH_MOVEMENT_OUT_TYPES else "in"

    def void(self, *, voided_by_user_id: UUID, void_reason: str) -> None:
        if self.voided_at is not None:
            raise ValueError("El movimiento ya esta anulado")
        self.voided_at = datetime.now(timezone.utc)
        self.voided_by_user_id = voided_by_user_id
        self.void_reason = void_reason
