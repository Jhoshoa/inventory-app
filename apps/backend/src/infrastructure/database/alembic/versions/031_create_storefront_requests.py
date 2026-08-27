"""create storefront_requests (Nivel 1: solicitar + contacto manual)

Revision ID: 031
Revises: 030
Create Date: 2026-08-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "031"
down_revision: str | None = "030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if "storefront_requests" not in inspect(op.get_bind()).get_table_names():
        op.create_table(
            "storefront_requests",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "store_id",
                UUID(as_uuid=True),
                sa.ForeignKey("stores.id"),
                nullable=False,
            ),
            sa.Column(
                "product_id",
                UUID(as_uuid=True),
                sa.ForeignKey("products.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("product_name", sa.String(length=100), nullable=False),
            sa.Column("customer_name", sa.String(length=150), nullable=False),
            sa.Column("customer_phone", sa.String(length=30), nullable=False),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    indexes = {ix["name"] for ix in inspect(op.get_bind()).get_indexes("storefront_requests")}
    if "ix_storefront_requests_store_status" not in indexes:
        op.create_index(
            "ix_storefront_requests_store_status",
            "storefront_requests",
            ["store_id", "status"],
        )
    if "ix_storefront_requests_store_created" not in indexes:
        op.create_index(
            "ix_storefront_requests_store_created",
            "storefront_requests",
            ["store_id", "created_at"],
        )


def downgrade() -> None:
    if "storefront_requests" not in inspect(op.get_bind()).get_table_names():
        return
    indexes = {ix["name"] for ix in inspect(op.get_bind()).get_indexes("storefront_requests")}
    if "ix_storefront_requests_store_created" in indexes:
        op.drop_index("ix_storefront_requests_store_created", table_name="storefront_requests")
    if "ix_storefront_requests_store_status" in indexes:
        op.drop_index("ix_storefront_requests_store_status", table_name="storefront_requests")
    op.drop_table("storefront_requests")
