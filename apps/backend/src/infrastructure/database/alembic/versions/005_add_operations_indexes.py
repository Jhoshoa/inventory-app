"""add operations indexes

Revision ID: 005
Revises: 004
Create Date: 2026-05-19

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _indexes(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {index["name"] for index in inspect(bind).get_indexes(table_name)}


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str]) -> None:
    if index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    _create_index_if_missing("products", "ix_products_store_name", ["store_id", "name"])
    _create_index_if_missing("products", "ix_products_store_category", ["store_id", "category"])
    _create_index_if_missing("products", "ix_products_store_sku", ["store_id", "sku"])
    _create_index_if_missing("products", "ix_products_store_qr_code", ["store_id", "qr_code"])
    _create_index_if_missing("products", "ix_products_store_stock", ["store_id", "stock"])
    _create_index_if_missing("sale_items", "ix_sale_items_product_id", ["product_id"])


def downgrade() -> None:
    for table_name, index_name in (
        ("sale_items", "ix_sale_items_product_id"),
        ("products", "ix_products_store_stock"),
        ("products", "ix_products_store_qr_code"),
        ("products", "ix_products_store_sku"),
        ("products", "ix_products_store_category"),
        ("products", "ix_products_store_name"),
    ):
        if index_name in _indexes(table_name):
            op.drop_index(index_name, table_name=table_name)
