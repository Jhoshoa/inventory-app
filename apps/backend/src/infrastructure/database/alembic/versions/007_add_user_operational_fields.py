"""add user operational fields

Revision ID: 007
Revises: 006
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    columns = _columns("users")
    if "updated_at" not in columns:
        op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    if "last_login_at" not in columns:
        op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True)))
    if "ix_users_store_role" not in _indexes("users"):
        op.create_index("ix_users_store_role", "users", ["store_id", "role"])


def downgrade() -> None:
    if "ix_users_store_role" in _indexes("users"):
        op.drop_index("ix_users_store_role", table_name="users")
    columns = _columns("users")
    if "last_login_at" in columns:
        op.drop_column("users", "last_login_at")
    if "updated_at" in columns:
        op.drop_column("users", "updated_at")
