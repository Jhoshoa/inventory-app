"""add store business days

Revision ID: 009
Revises: 008
Create Date: 2026-05-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def _tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    store_columns = _columns("stores")
    if "timezone" not in store_columns:
        op.add_column(
            "stores",
            sa.Column("timezone", sa.String(length=64), nullable=False, server_default="America/La_Paz"),
        )
        op.alter_column("stores", "timezone", server_default=None)
    if "first_business_date" not in store_columns:
        op.add_column("stores", sa.Column("first_business_date", sa.Date()))

    if "store_business_days" not in _tables():
        op.create_table(
            "store_business_days",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("business_date", sa.Date(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("closed_at", sa.DateTime(timezone=True)),
            sa.Column("opened_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("closed_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
            sa.Column("opening_note", sa.String(length=255)),
            sa.Column("closing_note", sa.String(length=255)),
            sa.Column("sales_total", sa.Numeric(12, 2)),
            sa.Column("sales_count", sa.Integer()),
            sa.Column("voided_sales_count", sa.Integer()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("store_id", "business_date", name="uq_store_business_days_store_date"),
        )
        op.create_index("ix_store_business_days_store_status", "store_business_days", ["store_id", "status"])
        op.create_index("ix_store_business_days_store_date", "store_business_days", ["store_id", "business_date"])
        op.create_index(
            "ix_store_business_days_store_opened_closed",
            "store_business_days",
            ["store_id", "opened_at", "closed_at"],
        )

    sale_columns = _columns("sales")
    if "business_day_id" not in sale_columns:
        op.add_column("sales", sa.Column("business_day_id", UUID(as_uuid=True), sa.ForeignKey("store_business_days.id")))
    if "business_date" not in sale_columns:
        op.add_column("sales", sa.Column("business_date", sa.Date()))
    if "created_by_user_id" not in sale_columns:
        op.add_column("sales", sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id")))

    sale_indexes = _indexes("sales")
    if "ix_sales_store_business_date_created_at" not in sale_indexes:
        op.create_index("ix_sales_store_business_date_created_at", "sales", ["store_id", "business_date", "created_at"])
    if "ix_sales_store_business_day" not in sale_indexes:
        op.create_index("ix_sales_store_business_day", "sales", ["store_id", "business_day_id"])


def downgrade() -> None:
    sale_indexes = _indexes("sales")
    if "ix_sales_store_business_day" in sale_indexes:
        op.drop_index("ix_sales_store_business_day", table_name="sales")
    if "ix_sales_store_business_date_created_at" in sale_indexes:
        op.drop_index("ix_sales_store_business_date_created_at", table_name="sales")

    sale_columns = _columns("sales")
    if "created_by_user_id" in sale_columns:
        op.drop_column("sales", "created_by_user_id")
    if "business_date" in sale_columns:
        op.drop_column("sales", "business_date")
    if "business_day_id" in sale_columns:
        op.drop_column("sales", "business_day_id")

    if "store_business_days" in _tables():
        op.drop_index("ix_store_business_days_store_opened_closed", table_name="store_business_days")
        op.drop_index("ix_store_business_days_store_date", table_name="store_business_days")
        op.drop_index("ix_store_business_days_store_status", table_name="store_business_days")
        op.drop_table("store_business_days")

    store_columns = _columns("stores")
    if "first_business_date" in store_columns:
        op.drop_column("stores", "first_business_date")
    if "timezone" in store_columns:
        op.drop_column("stores", "timezone")
