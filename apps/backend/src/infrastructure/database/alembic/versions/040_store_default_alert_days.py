"""stores.default_alert_days (aviso de vencimiento por defecto)

Revision ID: 040
Revises: 039
Create Date: 2026-11-11

How many days before the expiry date a new lot starts to show as "por
vencer" when the owner does not type a number. It is used when a product is
created with an expiry date, when stock is added with a lot and when a CSV
row has `vence` but no `aviso_dias`. Existing stores keep the current
behaviour: 5 days.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "040"
down_revision: str | None = "039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_column(table: str, name: str) -> bool:
    return any(column["name"] == name for column in inspect(op.get_bind()).get_columns(table))


def upgrade() -> None:
    if not _has_column("stores", "default_alert_days"):
        op.add_column(
            "stores",
            sa.Column("default_alert_days", sa.Integer(), nullable=False, server_default="5"),
        )


def downgrade() -> None:
    if _has_column("stores", "default_alert_days"):
        op.drop_column("stores", "default_alert_days")
