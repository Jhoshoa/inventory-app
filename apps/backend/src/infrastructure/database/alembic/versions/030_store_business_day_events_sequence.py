"""add deterministic sequence to store_business_day_events

Revision ID: 030
Revises: 029
Create Date: 2026-08-27

created_at alone is not a reliable tiebreaker for event ordering: on some
hosts datetime.now() can return the same value across rapid successive
calls (clock resolution), and the previous tiebreaker (a random UUID id)
has no relation to insertion order. This adds an explicit per-business-day
sequence number, backfilled from existing (created_at, id) ordering.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text

revision: str = "030"
down_revision: str | None = "029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("store_business_day_events")}
    if "sequence" not in columns:
        op.add_column(
            "store_business_day_events",
            sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
        )

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        bind.execute(
            text(
                """
                UPDATE store_business_day_events e
                SET sequence = ranked.rank
                FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY business_day_id ORDER BY created_at ASC, id ASC
                    ) AS rank
                    FROM store_business_day_events
                ) AS ranked
                WHERE e.id = ranked.id
                """
            )
        )


def downgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("store_business_day_events")}
    if "sequence" in columns:
        op.drop_column("store_business_day_events", "sequence")
