"""create billing_audit_log and webhook_events tables

Revision ID: 020
Revises: 019
Create Date: 2026-07-09 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    tables = _tables()

    if "billing_audit_log" not in tables:
        op.create_table(
            "billing_audit_log",
            sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("changed_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("changed_by_email", sa.String(255), nullable=False),
            sa.Column("old_values", sa.JSON(), nullable=True),
            sa.Column("new_values", sa.JSON(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("ix_billing_audit_store", "billing_audit_log", ["store_id"])
        op.create_index("ix_billing_audit_created", "billing_audit_log", ["created_at"])

    if "webhook_events" not in tables:
        op.create_table(
            "webhook_events",
            sa.Column("event_id", sa.String(255), primary_key=True),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column("store_id", sa.Uuid(), sa.ForeignKey("stores.id"), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="processed"),
            sa.Column("payload", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("ix_webhook_events_type", "webhook_events", ["event_type"])
        op.create_index("ix_webhook_events_created", "webhook_events", ["created_at"])


def downgrade() -> None:
    tables = _tables()
    for table in ("webhook_events", "billing_audit_log"):
        if table in tables:
            op.drop_table(table)
