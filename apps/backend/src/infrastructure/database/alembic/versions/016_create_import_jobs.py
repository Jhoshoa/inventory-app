"""create import_jobs table

Revision ID: 016
Revises: cd682c8574c1
Create Date: 2026-07-07 15:55:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from src.infrastructure.database.types import GUID

revision: str = "016"
down_revision: Union[str, None] = "cd682c8574c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "import_jobs",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("store_id", GUID(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="validating"),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("imported_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errors", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_import_jobs_store_completed",
        "import_jobs",
        ["store_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_import_jobs_store_completed", table_name="import_jobs")
    op.drop_table("import_jobs")
