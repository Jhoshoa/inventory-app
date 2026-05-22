"""create cash movements

Revision ID: 013
Revises: 012
Create Date: 2026-05-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

from src.infrastructure.database.types import GUID

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    if "cash_movements" not in _tables():
        op.create_table(
            "cash_movements",
            sa.Column("id", GUID(), primary_key=True),
            sa.Column("store_id", GUID(), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("business_day_id", GUID(), sa.ForeignKey("store_business_days.id"), nullable=False),
            sa.Column("movement_type", sa.String(length=30), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("note", sa.String(length=255)),
            sa.Column("created_by_user_id", GUID(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("voided_at", sa.DateTime(timezone=True)),
            sa.Column("voided_by_user_id", GUID(), sa.ForeignKey("users.id")),
            sa.Column("void_reason", sa.String(length=255)),
        )

    indexes = _indexes("cash_movements")
    for name, columns in [
        ("ix_cash_movements_store_day_occurred", ["store_id", "business_day_id", "occurred_at"]),
        ("ix_cash_movements_store_occurred", ["store_id", "occurred_at"]),
        ("ix_cash_movements_store_type_occurred", ["store_id", "movement_type", "occurred_at"]),
        ("ix_cash_movements_business_day_occurred", ["business_day_id", "occurred_at"]),
    ]:
        if name not in indexes:
            op.create_index(name, "cash_movements", columns)

    columns = _columns("store_business_days")
    for name, column_type in [
        ("closing_cash_movements_in_total", sa.Numeric(12, 2)),
        ("closing_cash_movements_out_total", sa.Numeric(12, 2)),
        ("closing_cash_movements_count", sa.Integer()),
    ]:
        if name not in columns:
            op.add_column("store_business_days", sa.Column(name, column_type))


def downgrade() -> None:
    columns = _columns("store_business_days")
    for name in [
        "closing_cash_movements_count",
        "closing_cash_movements_out_total",
        "closing_cash_movements_in_total",
    ]:
        if name in columns:
            op.drop_column("store_business_days", name)

    if "cash_movements" in _tables():
        op.drop_table("cash_movements")
