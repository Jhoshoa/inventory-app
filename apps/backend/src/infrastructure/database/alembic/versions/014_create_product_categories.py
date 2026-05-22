"""create product categories

Revision ID: 014
Revises: 013
Create Date: 2026-05-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

from src.infrastructure.database.types import GUID

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def _unique_constraints(table_name: str) -> set[str]:
    return {constraint["name"] for constraint in inspect(op.get_bind()).get_unique_constraints(table_name)}


def upgrade() -> None:
    if "product_categories" not in _tables():
        op.create_table(
            "product_categories",
            sa.Column("id", GUID(), primary_key=True),
            sa.Column("store_id", GUID(), sa.ForeignKey("stores.id"), nullable=False),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.Column("sku_prefix", sa.String(length=8), nullable=False),
            sa.Column("next_sku_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("store_id", "name", name="uq_product_categories_store_name"),
            sa.UniqueConstraint("store_id", "sku_prefix", name="uq_product_categories_store_sku_prefix"),
        )

    category_indexes = _indexes("product_categories")
    if "ix_product_categories_store_active_name" not in category_indexes:
        op.create_index(
            "ix_product_categories_store_active_name",
            "product_categories",
            ["store_id", "is_active", "name"],
        )

    product_columns = _columns("products")
    if "category_id" not in product_columns:
        op.add_column("products", sa.Column("category_id", GUID(), sa.ForeignKey("product_categories.id")))

    product_indexes = _indexes("products")
    if "ix_products_store_category_id" not in product_indexes:
        op.create_index("ix_products_store_category_id", "products", ["store_id", "category_id"])

    product_indexes = _indexes("products")
    if "uq_products_store_sku" not in product_indexes:
        op.create_index("uq_products_store_sku", "products", ["store_id", "sku"], unique=True)


def downgrade() -> None:
    product_indexes = _indexes("products")
    if "uq_products_store_sku" in product_indexes:
        op.drop_index("uq_products_store_sku", table_name="products")
    if "ix_products_store_category_id" in product_indexes:
        op.drop_index("ix_products_store_category_id", table_name="products")

    product_columns = _columns("products")
    if "category_id" in product_columns:
        op.drop_column("products", "category_id")

    if "product_categories" in _tables():
        op.drop_table("product_categories")
