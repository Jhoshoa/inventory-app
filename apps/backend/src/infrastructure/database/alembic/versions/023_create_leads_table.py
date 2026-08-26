"""create leads table for public marketing contact form

Revision ID: 023
Revises: 022
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "023"
down_revision: str | None = "022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "leads" not in tables:
        op.create_table(
            "leads",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(150), nullable=False),
            sa.Column("phone", sa.String(30), nullable=False),
            sa.Column("store_name", sa.String(150), nullable=True),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("business_type", sa.String(100), nullable=True),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("source_page", sa.String(255), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_leads_created_at", "leads", ["created_at"])


def downgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "leads" in tables:
        op.drop_index("ix_leads_created_at", table_name="leads")
        op.drop_table("leads")
