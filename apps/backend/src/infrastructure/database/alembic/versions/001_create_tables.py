"""create initial tables

Revision ID: 001
Revises:
Create Date: 2026-05-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stores",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("address", sa.String(255)),
        sa.Column("phone", sa.String(20)),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("store_id", UUID, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50)),
        sa.Column("sku", sa.String(50)),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("cost_price", sa.Numeric(10, 2)),
        sa.Column("stock", sa.Integer, default=0),
        sa.Column("min_stock", sa.Integer, default=5),
        sa.Column("unit", sa.String(20), default="unidad"),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("qr_code", sa.String(100), unique=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("extra_data", JSON, default=dict),
        sa.Column("version", sa.Integer, default=1),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sales",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("store_id", UUID, nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_method", sa.String(20), default="efectivo"),
        sa.Column("status", sa.String(20), default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sale_items",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("sale_id", UUID, nullable=False),
        sa.Column("product_id", UUID, nullable=False),
        sa.Column("product_name", sa.String(100), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
    )
    op.create_foreign_key("fk_sale_items_sale", "sale_items", "sales", ["sale_id"], ["id"])

    op.create_table(
        "users",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("store_id", UUID),
        sa.Column("full_name", sa.String(100)),
        sa.Column("role", sa.String(20), default="cashier"),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "exchange_rates",
        sa.Column("date", sa.Date, primary_key=True),
        sa.Column("source", sa.String(20), primary_key=True),
        sa.Column("buy_price", sa.Numeric(10, 4), nullable=False),
        sa.Column("sell_price", sa.Numeric(10, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("exchange_rates")
    op.drop_table("users")
    op.drop_table("sale_items")
    op.drop_table("sales")
    op.drop_table("products")
    op.drop_table("stores")
