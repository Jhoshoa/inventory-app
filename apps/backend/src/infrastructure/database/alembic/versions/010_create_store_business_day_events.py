"""create store business day events

Revision ID: 010
Revises: 009
Create Date: 2026-05-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text
from sqlalchemy.dialects.postgresql import UUID

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def _tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "store_business_day_events" not in _tables():
        op.create_table(
            "store_business_day_events",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("business_day_id", UUID(as_uuid=True), sa.ForeignKey("store_business_days.id"), nullable=False),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("event_type", sa.String(length=20), nullable=False),
            sa.Column("note", sa.String(length=255)),
            sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    indexes = _indexes("store_business_day_events")
    if "ix_store_business_day_events_day_created" not in indexes:
        op.create_index(
            "ix_store_business_day_events_day_created",
            "store_business_day_events",
            ["business_day_id", "created_at"],
        )
    if "ix_store_business_day_events_store_created" not in indexes:
        op.create_index(
            "ix_store_business_day_events_store_created",
            "store_business_day_events",
            ["store_id", "created_at"],
        )
    if "ix_store_business_day_events_day_type_created" not in indexes:
        op.create_index(
            "ix_store_business_day_events_day_type_created",
            "store_business_day_events",
            ["business_day_id", "event_type", "created_at"],
        )

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        bind.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        bind.execute(
            text(
                """
                INSERT INTO store_business_day_events (
                    id,
                    business_day_id,
                    store_id,
                    event_type,
                    note,
                    created_by_user_id,
                    created_at
                )
                SELECT gen_random_uuid(), id, store_id, 'open', opening_note, opened_by_user_id, opened_at
                FROM store_business_days
                WHERE opened_by_user_id IS NOT NULL
                """
            )
        )
        bind.execute(
            text(
                """
                INSERT INTO store_business_day_events (
                    id,
                    business_day_id,
                    store_id,
                    event_type,
                    note,
                    created_by_user_id,
                    created_at
                )
                SELECT gen_random_uuid(), id, store_id, 'close', closing_note, closed_by_user_id, closed_at
                FROM store_business_days
                WHERE closed_by_user_id IS NOT NULL AND closed_at IS NOT NULL
                """
            )
        )


def downgrade() -> None:
    if "store_business_day_events" not in _tables():
        return
    indexes = _indexes("store_business_day_events")
    if "ix_store_business_day_events_day_type_created" in indexes:
        op.drop_index("ix_store_business_day_events_day_type_created", table_name="store_business_day_events")
    if "ix_store_business_day_events_store_created" in indexes:
        op.drop_index("ix_store_business_day_events_store_created", table_name="store_business_day_events")
    if "ix_store_business_day_events_day_created" in indexes:
        op.drop_index("ix_store_business_day_events_day_created", table_name="store_business_day_events")
    op.drop_table("store_business_day_events")
