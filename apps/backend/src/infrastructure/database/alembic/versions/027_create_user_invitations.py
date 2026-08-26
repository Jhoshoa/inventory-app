"""create user_invitations table

Revision ID: 027
Revises: 026
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "027"
down_revision: str | None = "026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "user_invitations" not in tables:
        op.create_table(
            "user_invitations",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("role", sa.String(20), nullable=False, server_default="cashier"),
            sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("invited_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("accepted_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("send_count", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_user_invitations_store_status", "user_invitations", ["store_id", "status"])
        op.create_index("ix_user_invitations_email", "user_invitations", ["email"])
        op.create_index("ix_user_invitations_expires_at", "user_invitations", ["expires_at"])


def downgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "user_invitations" in tables:
        op.drop_index("ix_user_invitations_expires_at", table_name="user_invitations")
        op.drop_index("ix_user_invitations_email", table_name="user_invitations")
        op.drop_index("ix_user_invitations_store_status", table_name="user_invitations")
        op.drop_table("user_invitations")
