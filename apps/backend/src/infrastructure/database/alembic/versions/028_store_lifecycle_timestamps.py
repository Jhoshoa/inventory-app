"""add stores.suspended_at and stores.archived_at

Revision ID: 028
Revises: 027
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "028"
down_revision: str | None = "027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    if "suspended_at" not in columns:
        op.add_column("stores", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True))
    if "archived_at" not in columns:
        op.add_column("stores", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))

    indexes = {ix["name"] for ix in inspect(op.get_bind()).get_indexes("stores")}
    if "ix_stores_access_status_suspended_at" not in indexes:
        op.create_index(
            "ix_stores_access_status_suspended_at",
            "stores",
            ["access_status", "suspended_at"],
        )


def downgrade() -> None:
    indexes = {ix["name"] for ix in inspect(op.get_bind()).get_indexes("stores")}
    if "ix_stores_access_status_suspended_at" in indexes:
        op.drop_index("ix_stores_access_status_suspended_at", table_name="stores")

    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    if "archived_at" in columns:
        op.drop_column("stores", "archived_at")
    if "suspended_at" in columns:
        op.drop_column("stores", "suspended_at")
