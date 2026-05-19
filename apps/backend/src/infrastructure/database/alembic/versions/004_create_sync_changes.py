"""create sync changes

Revision ID: 004
Revises: 003
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _indexes(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {index["name"] for index in inspect(bind).get_indexes(table_name)}


def upgrade() -> None:
    op.create_table(
        "sync_changes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("device_id", sa.String(100), nullable=False),
        sa.Column("client_change_id", sa.String(120), nullable=False),
        sa.Column("entity", sa.String(40), nullable=False),
        sa.Column("operation", sa.String(40), nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("error_code", sa.String(60)),
        sa.Column("error_detail", sa.Text),
        sa.Column("server_version", sa.Integer),
        sa.Column("server_updated_at", sa.DateTime(timezone=True)),
        sa.Column("client_created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("store_id", "device_id", "client_change_id", name="uq_sync_changes_store_device_change"),
    )
    op.create_index("ix_sync_changes_store_device", "sync_changes", ["store_id", "device_id"])
    op.create_index("ix_sync_changes_store_processed_at", "sync_changes", ["store_id", "processed_at"])
    op.create_index("ix_sync_changes_entity", "sync_changes", ["entity"])


def downgrade() -> None:
    for index_name in (
        "ix_sync_changes_entity",
        "ix_sync_changes_store_processed_at",
        "ix_sync_changes_store_device",
    ):
        if index_name in _indexes("sync_changes"):
            op.drop_index(index_name, table_name="sync_changes")
    op.drop_table("sync_changes")
