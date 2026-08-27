"""add storefront payment qr fields (Nivel 2: QR propio + confirmacion manual)

Revision ID: 032
Revises: 031
Create Date: 2026-08-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "032"
down_revision: str | None = "031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW_COLUMNS = (
    ("storefront_payment_qr_url", sa.String(500)),
    ("storefront_payment_instructions", sa.String(280)),
)


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    for name, col_type in _NEW_COLUMNS:
        if name not in columns:
            op.add_column("stores", sa.Column(name, col_type, nullable=True))


def downgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    for name, _col_type in reversed(_NEW_COLUMNS):
        if name in columns:
            op.drop_column("stores", name)
