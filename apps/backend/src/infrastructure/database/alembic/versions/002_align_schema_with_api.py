"""align schema with api models

Revision ID: 002
Revises: 001
Create Date: 2026-05-12

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {column["name"] for column in inspect(bind).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {index["name"] for index in inspect(bind).get_indexes(table_name)}


def _foreign_keys(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {fk["name"] for fk in inspect(bind).get_foreign_keys(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _columns(table_name):
        op.add_column(table_name, column)


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str]) -> None:
    if index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, columns)


def _create_fk_if_missing(
    table_name: str,
    constraint_name: str,
    referent_table: str,
    local_cols: list[str],
    remote_cols: list[str],
    ondelete: str | None = None,
) -> None:
    if constraint_name not in _foreign_keys(table_name):
        op.create_foreign_key(
            constraint_name,
            table_name,
            referent_table,
            local_cols,
            remote_cols,
            ondelete=ondelete,
        )


def upgrade() -> None:
    _add_column_if_missing(
        "stores",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    _create_fk_if_missing(
        "products",
        "fk_products_store",
        "stores",
        ["store_id"],
        ["id"],
    )
    _create_index_if_missing("products", "ix_products_store_id", ["store_id"])
    _create_index_if_missing("products", "ix_products_updated_at", ["updated_at"])

    _add_column_if_missing("sales", sa.Column("device_id", sa.String(100)))
    _add_column_if_missing("sales", sa.Column("customer_name", sa.String(100)))
    _add_column_if_missing(
        "sales",
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "sales",
        sa.Column("discount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "sales",
        sa.Column("items_count", sa.Integer, nullable=False, server_default="0"),
    )
    _add_column_if_missing("sales", sa.Column("synced", sa.Boolean, server_default=sa.false()))
    _add_column_if_missing("sales", sa.Column("version", sa.Integer, server_default="1"))
    _add_column_if_missing("sales", sa.Column("deleted_at", sa.DateTime(timezone=True)))

    _create_fk_if_missing(
        "sales",
        "fk_sales_store",
        "stores",
        ["store_id"],
        ["id"],
    )
    _create_index_if_missing("sales", "ix_sales_store_id", ["store_id"])
    _create_index_if_missing("sales", "ix_sales_created_at", ["created_at"])

    _create_fk_if_missing(
        "sale_items",
        "fk_sale_items_product",
        "products",
        ["product_id"],
        ["id"],
    )

    _create_fk_if_missing(
        "users",
        "fk_users_store",
        "stores",
        ["store_id"],
        ["id"],
    )
    _create_index_if_missing("users", "ix_users_store_id", ["store_id"])


def downgrade() -> None:
    for table_name, index_name in (
        ("users", "ix_users_store_id"),
        ("sales", "ix_sales_created_at"),
        ("sales", "ix_sales_store_id"),
        ("products", "ix_products_updated_at"),
        ("products", "ix_products_store_id"),
    ):
        if index_name in _indexes(table_name):
            op.drop_index(index_name, table_name=table_name)

    for table_name, fk_name in (
        ("users", "fk_users_store"),
        ("sale_items", "fk_sale_items_product"),
        ("sales", "fk_sales_store"),
        ("products", "fk_products_store"),
    ):
        if fk_name in _foreign_keys(table_name):
            op.drop_constraint(fk_name, table_name, type_="foreignkey")

    for column_name in (
        "deleted_at",
        "version",
        "synced",
        "items_count",
        "discount",
        "subtotal",
        "customer_name",
        "device_id",
    ):
        if column_name in _columns("sales"):
            op.drop_column("sales", column_name)

    if "updated_at" in _columns("stores"):
        op.drop_column("stores", "updated_at")
