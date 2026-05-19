"""create stock movements

Revision ID: 003
Revises: 002
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _indexes(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {index["name"] for index in inspect(bind).get_indexes(table_name)}


def upgrade() -> None:
    op.create_table(
        "stock_movements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("sale_id", UUID(as_uuid=True), sa.ForeignKey("sales.id")),
        sa.Column("movement_type", sa.String(40), nullable=False),
        sa.Column("quantity_delta", sa.Integer, nullable=False),
        sa.Column("stock_after", sa.Integer, nullable=False),
        sa.Column("reason", sa.String(120)),
        sa.Column("device_id", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_stock_movements_store_id_created_at",
        "stock_movements",
        ["store_id", "created_at"],
    )
    op.create_index("ix_stock_movements_product_id", "stock_movements", ["product_id"])

    if "ix_products_store_id_id" not in _indexes("products"):
        op.create_index("ix_products_store_id_id", "products", ["store_id", "id"])
    if "ix_sales_store_id_id" not in _indexes("sales"):
        op.create_index("ix_sales_store_id_id", "sales", ["store_id", "id"])


def downgrade() -> None:
    for table_name, index_name in (
        ("sales", "ix_sales_store_id_id"),
        ("products", "ix_products_store_id_id"),
        ("stock_movements", "ix_stock_movements_product_id"),
        ("stock_movements", "ix_stock_movements_store_id_created_at"),
    ):
        if index_name in _indexes(table_name):
            op.drop_index(index_name, table_name=table_name)

    op.drop_table("stock_movements")
