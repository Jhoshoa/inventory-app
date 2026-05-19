"""add sale void fields and stock indexes

Revision ID: 008
Revises: 007
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    sale_columns = _columns("sales")
    if "voided_at" not in sale_columns:
        op.add_column("sales", sa.Column("voided_at", sa.DateTime(timezone=True)))
    if "void_reason" not in sale_columns:
        op.add_column("sales", sa.Column("void_reason", sa.String(length=200)))
    if "ix_sales_store_status_created_at" not in _indexes("sales"):
        op.create_index("ix_sales_store_status_created_at", "sales", ["store_id", "status", "created_at"])
    if "ix_stock_movements_store_product_created_at" not in _indexes("stock_movements"):
        op.create_index(
            "ix_stock_movements_store_product_created_at",
            "stock_movements",
            ["store_id", "product_id", "created_at"],
        )


def downgrade() -> None:
    if "ix_stock_movements_store_product_created_at" in _indexes("stock_movements"):
        op.drop_index("ix_stock_movements_store_product_created_at", table_name="stock_movements")
    if "ix_sales_store_status_created_at" in _indexes("sales"):
        op.drop_index("ix_sales_store_status_created_at", table_name="sales")
    sale_columns = _columns("sales")
    if "void_reason" in sale_columns:
        op.drop_column("sales", "void_reason")
    if "voided_at" in sale_columns:
        op.drop_column("sales", "voided_at")
