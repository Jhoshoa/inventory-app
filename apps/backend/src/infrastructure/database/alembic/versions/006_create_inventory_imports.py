"""create inventory imports

Revision ID: 006
Revises: 005
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from src.infrastructure.database.types import GUID

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventory_imports",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("store_id", GUID(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("source_filename", sa.String(length=255)),
        sa.Column("source_content_type", sa.String(length=100)),
        sa.Column("source_photo_url", sa.String(length=500)),
        sa.Column("raw_text", sa.Text()),
        sa.Column("error_message", sa.Text()),
        sa.Column("items_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by", GUID()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_inventory_imports_store_created_at", "inventory_imports", ["store_id", "created_at"])
    op.create_index("ix_inventory_imports_store_status", "inventory_imports", ["store_id", "status"])

    op.create_table(
        "inventory_import_items",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("import_id", GUID(), sa.ForeignKey("inventory_imports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("store_id", GUID(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50)),
        sa.Column("sku", sa.String(length=50)),
        sa.Column("unit", sa.String(length=20), nullable=False, server_default="unidad"),
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("cost_price", sa.Numeric(10, 2)),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_stock", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("confidence", sa.Numeric(5, 4)),
        sa.Column("raw_data", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("product_id", GUID(), sa.ForeignKey("products.id")),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_inventory_import_items_store_import", "inventory_import_items", ["store_id", "import_id"])
    op.create_index("ix_inventory_import_items_import_status", "inventory_import_items", ["import_id", "status"])
    op.create_index("ix_inventory_import_items_store_name", "inventory_import_items", ["store_id", "name"])


def downgrade() -> None:
    op.drop_index("ix_inventory_import_items_store_name", table_name="inventory_import_items")
    op.drop_index("ix_inventory_import_items_import_status", table_name="inventory_import_items")
    op.drop_index("ix_inventory_import_items_store_import", table_name="inventory_import_items")
    op.drop_table("inventory_import_items")
    op.drop_index("ix_inventory_imports_store_status", table_name="inventory_imports")
    op.drop_index("ix_inventory_imports_store_created_at", table_name="inventory_imports")
    op.drop_table("inventory_imports")
