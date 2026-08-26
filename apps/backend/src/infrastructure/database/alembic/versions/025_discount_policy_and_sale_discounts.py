"""discount policy on stores and discount fields on sales

Revision ID: 025
Revises: 024
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "025"
down_revision: str | None = "024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(table_name: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    store_columns = _columns("stores")
    if "allow_percentage_discount" not in store_columns:
        op.add_column(
            "stores",
            sa.Column("allow_percentage_discount", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "max_percentage_discount" not in store_columns:
        op.add_column(
            "stores",
            sa.Column("max_percentage_discount", sa.Numeric(5, 2), nullable=False, server_default="0"),
        )
    if "allow_manual_discount" not in store_columns:
        op.add_column(
            "stores",
            sa.Column("allow_manual_discount", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "max_manual_discount_amount" not in store_columns:
        op.add_column(
            "stores",
            sa.Column("max_manual_discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        )

    sale_columns = _columns("sales")
    if "discount_type" not in sale_columns:
        op.add_column("sales", sa.Column("discount_type", sa.String(20), nullable=True))
    if "discount_value" not in sale_columns:
        op.add_column(
            "sales",
            sa.Column("discount_value", sa.Numeric(12, 2), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    sale_columns = _columns("sales")
    if "discount_value" in sale_columns:
        op.drop_column("sales", "discount_value")
    if "discount_type" in sale_columns:
        op.drop_column("sales", "discount_type")

    store_columns = _columns("stores")
    if "max_manual_discount_amount" in store_columns:
        op.drop_column("stores", "max_manual_discount_amount")
    if "allow_manual_discount" in store_columns:
        op.drop_column("stores", "allow_manual_discount")
    if "max_percentage_discount" in store_columns:
        op.drop_column("stores", "max_percentage_discount")
    if "allow_percentage_discount" in store_columns:
        op.drop_column("stores", "allow_percentage_discount")
