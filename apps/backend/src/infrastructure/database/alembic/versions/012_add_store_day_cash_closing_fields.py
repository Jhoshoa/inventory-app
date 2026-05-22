"""add store day cash closing fields

Revision ID: 012
Revises: 011
Create Date: 2026-05-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    columns = _columns("store_business_days")
    new_columns = [
        ("opening_cash_amount", sa.Numeric(12, 2)),
        ("expected_cash_amount", sa.Numeric(12, 2)),
        ("counted_cash_amount", sa.Numeric(12, 2)),
        ("cash_difference_amount", sa.Numeric(12, 2)),
        ("closing_sales_total", sa.Numeric(12, 2)),
        ("closing_sales_count", sa.Integer()),
        ("closing_voided_sales_count", sa.Integer()),
        ("closing_items_count", sa.Integer()),
        ("closing_cash_sales_total", sa.Numeric(12, 2)),
        ("closing_qr_sales_total", sa.Numeric(12, 2)),
        ("closing_transfer_sales_total", sa.Numeric(12, 2)),
        ("closing_card_sales_total", sa.Numeric(12, 2)),
        ("closing_snapshot_at", sa.DateTime(timezone=True)),
    ]
    for name, column_type in new_columns:
        if name not in columns:
            op.add_column("store_business_days", sa.Column(name, column_type))


def downgrade() -> None:
    columns = _columns("store_business_days")
    for name in [
        "closing_snapshot_at",
        "closing_card_sales_total",
        "closing_transfer_sales_total",
        "closing_qr_sales_total",
        "closing_cash_sales_total",
        "closing_items_count",
        "closing_voided_sales_count",
        "closing_sales_count",
        "closing_sales_total",
        "cash_difference_amount",
        "counted_cash_amount",
        "expected_cash_amount",
        "opening_cash_amount",
    ]:
        if name in columns:
            op.drop_column("store_business_days", name)
