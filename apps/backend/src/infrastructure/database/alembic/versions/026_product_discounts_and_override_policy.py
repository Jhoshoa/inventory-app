"""per-product discounts and cashier override policy

Revision ID: 026
Revises: 025
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "026"
down_revision: str | None = "025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(table_name: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    product_columns = _columns("products")
    if "discount_type" not in product_columns:
        op.add_column("products", sa.Column("discount_type", sa.String(20), nullable=True))
    if "discount_value" not in product_columns:
        op.add_column(
            "products",
            sa.Column("discount_value", sa.Numeric(12, 2), nullable=False, server_default="0"),
        )

    store_columns = _columns("stores")
    if "allow_cashier_discount_override" not in store_columns:
        op.add_column(
            "stores",
            sa.Column(
                "allow_cashier_discount_override",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    store_columns = _columns("stores")
    if "allow_cashier_discount_override" in store_columns:
        op.drop_column("stores", "allow_cashier_discount_override")

    product_columns = _columns("products")
    if "discount_value" in product_columns:
        op.drop_column("products", "discount_value")
    if "discount_type" in product_columns:
        op.drop_column("products", "discount_type")
