from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class StoreBusinessDay:
    id: UUID
    store_id: UUID
    business_date: date
    status: str
    opened_at: datetime
    opened_by_user_id: UUID
    closed_at: datetime | None = None
    closed_by_user_id: UUID | None = None
    opening_note: str | None = None
    closing_note: str | None = None
    sales_total: Decimal | None = None
    sales_count: int | None = None
    voided_sales_count: int | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def open(
        *,
        store_id: UUID,
        business_date: date,
        opened_by_user_id: UUID,
        opening_note: str | None = None,
    ) -> "StoreBusinessDay":
        return StoreBusinessDay(
            id=uuid4(),
            store_id=store_id,
            business_date=business_date,
            status="open",
            opened_at=datetime.now(timezone.utc),
            opened_by_user_id=opened_by_user_id,
            opening_note=opening_note,
        )

    def close(
        self,
        *,
        closed_by_user_id: UUID,
        closing_note: str | None = None,
        sales_total: Decimal | None = None,
        sales_count: int | None = None,
        voided_sales_count: int | None = None,
    ) -> None:
        if self.status != "open":
            raise ValueError("La jornada no esta abierta")
        self.status = "closed"
        self.closed_at = datetime.now(timezone.utc)
        self.closed_by_user_id = closed_by_user_id
        self.closing_note = closing_note
        self.sales_total = sales_total
        self.sales_count = sales_count
        self.voided_sales_count = voided_sales_count
        self.updated_at = datetime.now(timezone.utc)

    def reopen(self, *, opened_by_user_id: UUID, opening_note: str | None = None) -> None:
        if self.status != "closed":
            raise ValueError("Solo se puede reabrir una jornada cerrada")
        self.status = "open"
        self.opened_at = datetime.now(timezone.utc)
        self.opened_by_user_id = opened_by_user_id
        self.closed_at = None
        self.closed_by_user_id = None
        self.opening_note = opening_note
        self.closing_note = None
        self.sales_total = None
        self.sales_count = None
        self.voided_sales_count = None
        self.updated_at = datetime.now(timezone.utc)
