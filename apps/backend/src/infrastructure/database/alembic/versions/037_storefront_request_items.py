"""storefront orders with several products (boleta de pedido)

Revision ID: 037
Revises: 036
Create Date: 2026-11-10

A storefront request can now carry several products: each line lives in
storefront_request_items with the name, unit and price copied at order time,
and the request keeps the total and the delivery method chosen by the
customer. Requests created before this migration have no lines and keep
working with product_name.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "037"
down_revision: str | None = "036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("storefront_requests")}
    if "total" not in columns:
        op.add_column("storefront_requests", sa.Column("total", sa.Numeric(12, 2), nullable=True))
    if "delivery_method" not in columns:
        op.add_column("storefront_requests", sa.Column("delivery_method", sa.String(20), nullable=True))

    if "storefront_request_items" not in inspector.get_table_names():
        op.create_table(
            "storefront_request_items",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "request_id",
                UUID(as_uuid=True),
                sa.ForeignKey("storefront_requests.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
            sa.Column("product_name", sa.String(100), nullable=False),
            sa.Column("unit", sa.String(20), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        )
        op.create_index("ix_storefront_request_items_request", "storefront_request_items", ["request_id"])


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "storefront_request_items" in inspector.get_table_names():
        op.drop_index("ix_storefront_request_items_request", table_name="storefront_request_items")
        op.drop_table("storefront_request_items")
    columns = {col["name"] for col in inspector.get_columns("storefront_requests")}
    if "delivery_method" in columns:
        op.drop_column("storefront_requests", "delivery_method")
    if "total" in columns:
        op.drop_column("storefront_requests", "total")
