"""sales.voided_by_user_id (quien anulo la venta)

Revision ID: 041
Revises: 040
Create Date: 2026-11-11

Sales already record who created them (created_by_user_id). Voiding only
stored the time and the reason, so the sales screen could not say who voided
a sale. Sales voided before this migration keep it empty.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "041"
down_revision: str | None = "040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FK_NAME = "fk_sales_voided_by_user_id_users"


def _has_column(table: str, name: str) -> bool:
    return any(column["name"] == name for column in inspect(op.get_bind()).get_columns(table))


def upgrade() -> None:
    if not _has_column("sales", "voided_by_user_id"):
        op.add_column("sales", sa.Column("voided_by_user_id", UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(FK_NAME, "sales", "users", ["voided_by_user_id"], ["id"])


def downgrade() -> None:
    if _has_column("sales", "voided_by_user_id"):
        op.drop_constraint(FK_NAME, "sales", type_="foreignkey")
        op.drop_column("sales", "voided_by_user_id")
