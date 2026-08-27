"""add payment_confirmed to storefront_requests (Nivel 2)

Revision ID: 033
Revises: 032
Create Date: 2026-08-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "033"
down_revision: str | None = "032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("storefront_requests")}
    if "payment_confirmed" not in columns:
        op.add_column(
            "storefront_requests",
            sa.Column("payment_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("storefront_requests")}
    if "payment_confirmed" in columns:
        op.drop_column("storefront_requests", "payment_confirmed")
