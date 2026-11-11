"""product locations and expiry lots (FEFO)

Revision ID: 039
Revises: 038
Create Date: 2026-11-10

store_locations holds the physical places of a store (zone -> shelf ->
level) and product_locations links products to them, as display or storage.

product_batches holds the lots of a product with an expiry date, and
batch_consumptions records how many units each sale or adjustment took from
each lot, so that voiding a sale returns them to the same lots. The product
stock remains the source of truth: lots never add up to more than it, and
the rest is stock without a known expiry date. Existing products start with
no lots.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import UUID

revision: str = "039"
down_revision: str | None = "038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())

    if "store_locations" not in tables:
        op.create_table(
            "store_locations",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("zone", sa.String(50), nullable=False),
            sa.Column("shelf", sa.String(50), nullable=True),
            sa.Column("level", sa.String(30), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_store_locations_store_id", "store_locations", ["store_id"])

    if "product_locations" not in tables:
        op.create_table(
            "product_locations",
            sa.Column(
                "product_id",
                UUID(as_uuid=True),
                sa.ForeignKey("products.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                "location_id",
                UUID(as_uuid=True),
                sa.ForeignKey("store_locations.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("kind", sa.String(20), nullable=False, server_default="display"),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_product_locations_store_product", "product_locations", ["store_id", "product_id"])
        op.create_index("ix_product_locations_location_id", "product_locations", ["location_id"])

    if "product_batches" not in tables:
        op.create_table(
            "product_batches",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
            sa.Column("expires_on", sa.Date(), nullable=False),
            sa.Column("alert_days", sa.Integer(), nullable=False, server_default="5"),
            sa.Column("alert_on", sa.Date(), nullable=False),
            sa.Column("quantity_initial", sa.Integer(), nullable=False),
            sa.Column("quantity_remaining", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("quantity_remaining >= 0", name="ck_product_batches_remaining_non_negative"),
            sa.CheckConstraint(
                "quantity_remaining <= quantity_initial", name="ck_product_batches_remaining_le_initial"
            ),
            sa.CheckConstraint("alert_days >= 0", name="ck_product_batches_alert_days_non_negative"),
        )
        op.create_index("ix_product_batches_store_product", "product_batches", ["store_id", "product_id"])
        op.create_index("ix_product_batches_store_alert_on", "product_batches", ["store_id", "alert_on"])

    if "batch_consumptions" not in tables:
        op.create_table(
            "batch_consumptions",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("store_id", UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("batch_id", UUID(as_uuid=True), sa.ForeignKey("product_batches.id"), nullable=False),
            sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
            sa.Column("sale_id", UUID(as_uuid=True), sa.ForeignKey("sales.id"), nullable=True),
            sa.Column("stock_movement_id", UUID(as_uuid=True), sa.ForeignKey("stock_movements.id"), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(40), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_batch_consumptions_batch_id", "batch_consumptions", ["batch_id"])
        op.create_index("ix_batch_consumptions_sale_product", "batch_consumptions", ["sale_id", "product_id"])


def downgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "batch_consumptions" in tables:
        op.drop_index("ix_batch_consumptions_sale_product", table_name="batch_consumptions")
        op.drop_index("ix_batch_consumptions_batch_id", table_name="batch_consumptions")
        op.drop_table("batch_consumptions")
    if "product_batches" in tables:
        op.drop_index("ix_product_batches_store_alert_on", table_name="product_batches")
        op.drop_index("ix_product_batches_store_product", table_name="product_batches")
        op.drop_table("product_batches")
    if "product_locations" in tables:
        op.drop_index("ix_product_locations_location_id", table_name="product_locations")
        op.drop_index("ix_product_locations_store_product", table_name="product_locations")
        op.drop_table("product_locations")
    if "store_locations" in tables:
        op.drop_index("ix_store_locations_store_id", table_name="store_locations")
        op.drop_table("store_locations")
