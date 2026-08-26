"""support for billing automation: system-actor audit entries and platform admin role

Revision ID: 024
Revises: 023
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "024"
down_revision: str | None = "023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(table_name: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    # Las tareas automaticas (scheduler) escriben auditoria sin un usuario humano
    # detras; changed_by debe poder ser NULL para ese caso.
    op.alter_column("billing_audit_log", "changed_by", existing_type=sa.Uuid(), nullable=True)

    if "is_platform_admin" not in _columns("users"):
        op.add_column(
            "users",
            sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    if "is_platform_admin" in _columns("users"):
        op.drop_column("users", "is_platform_admin")
    op.alter_column("billing_audit_log", "changed_by", existing_type=sa.Uuid(), nullable=False)
