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
    opening_cash_amount: Decimal | None = None
    expected_cash_amount: Decimal | None = None
    counted_cash_amount: Decimal | None = None
    cash_difference_amount: Decimal | None = None
    closing_sales_total: Decimal | None = None
    closing_sales_count: int | None = None
    closing_voided_sales_count: int | None = None
    closing_items_count: int | None = None
    closing_cash_sales_total: Decimal | None = None
    closing_qr_sales_total: Decimal | None = None
    closing_transfer_sales_total: Decimal | None = None
    closing_card_sales_total: Decimal | None = None
    closing_cash_movements_in_total: Decimal | None = None
    closing_cash_movements_out_total: Decimal | None = None
    closing_cash_movements_count: int | None = None
    closing_snapshot_at: datetime | None = None
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
        opening_cash_amount: Decimal | None = None,
    ) -> "StoreBusinessDay":
        return StoreBusinessDay(
            id=uuid4(),
            store_id=store_id,
            business_date=business_date,
            status="open",
            opened_at=datetime.now(timezone.utc),
            opened_by_user_id=opened_by_user_id,
            opening_note=opening_note,
            opening_cash_amount=opening_cash_amount or Decimal("0"),
        )

    def close(
        self,
        *,
        closed_by_user_id: UUID,
        closing_note: str | None = None,
        sales_total: Decimal | None = None,
        sales_count: int | None = None,
        voided_sales_count: int | None = None,
        items_count: int | None = None,
        cash_sales_total: Decimal | None = None,
        qr_sales_total: Decimal | None = None,
        transfer_sales_total: Decimal | None = None,
        card_sales_total: Decimal | None = None,
        cash_movements_in_total: Decimal | None = None,
        cash_movements_out_total: Decimal | None = None,
        cash_movements_count: int | None = None,
        expected_cash_amount: Decimal | None = None,
        counted_cash_amount: Decimal | None = None,
        cash_difference_amount: Decimal | None = None,
    ) -> None:
        if self.status != "open":
            raise ValueError("La jornada no esta abierta")
        snapshot_at = datetime.now(timezone.utc)
        self.status = "closed"
        self.closed_at = snapshot_at
        self.closed_by_user_id = closed_by_user_id
        self.closing_note = closing_note
        self.sales_total = sales_total
        self.sales_count = sales_count
        self.voided_sales_count = voided_sales_count
        self.closing_sales_total = sales_total
        self.closing_sales_count = sales_count
        self.closing_voided_sales_count = voided_sales_count
        self.closing_items_count = items_count
        self.closing_cash_sales_total = cash_sales_total
        self.closing_qr_sales_total = qr_sales_total
        self.closing_transfer_sales_total = transfer_sales_total
        self.closing_card_sales_total = card_sales_total
        self.closing_cash_movements_in_total = cash_movements_in_total
        self.closing_cash_movements_out_total = cash_movements_out_total
        self.closing_cash_movements_count = cash_movements_count
        self.expected_cash_amount = expected_cash_amount
        self.counted_cash_amount = counted_cash_amount
        self.cash_difference_amount = cash_difference_amount
        self.closing_snapshot_at = snapshot_at
        self.updated_at = snapshot_at

    def reopen(self, *, opened_by_user_id: UUID, opening_note: str | None = None) -> None:
        if self.status != "closed":
            raise ValueError("Solo se puede reabrir una jornada cerrada")
        now = datetime.now(timezone.utc)
        self.status = "open"
        self.opened_at = now
        self.opened_by_user_id = opened_by_user_id
        self.closed_at = None
        self.closed_by_user_id = None
        self.opening_note = opening_note
        self.closing_note = None
        self.updated_at = now
