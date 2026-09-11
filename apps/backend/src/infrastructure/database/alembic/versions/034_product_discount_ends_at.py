"""add discount_ends_at to products (vencimiento de descuentos por producto)

Revision ID: 034
Revises: 033
Create Date: 2026-09-01

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "034"
down_revision: str | None = "033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("products")}
    if "discount_ends_at" not in columns:
        op.add_column(
            "products",
            sa.Column("discount_ends_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("products")}
    if "discount_ends_at" in columns:
        op.drop_column("products", "discount_ends_at")
