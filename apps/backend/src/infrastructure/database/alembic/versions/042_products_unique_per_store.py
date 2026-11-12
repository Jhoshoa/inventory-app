"""products: scan code unique per store; uniques ignore deleted products

Revision ID: 042
Revises: 041
Create Date: 2026-11-12

qr_code was UNIQUE across every store. Codes made from the SKU ("QR-LAC000001")
repeat in every store with a "Lacteos" category, and real barcodes (EAN) are the
same in every store, so a second store got "codigo ya en uso" or a 500 on import.
Now the code is unique per store.

The three uniques (code, SKU, name + unit) also only count products that are not
deleted, matching the checks the API already does; before, reusing the name or
code of a deleted product failed with a 500.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "042"
down_revision: str | None = "041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ACTIVE = sa.text("deleted_at IS NULL")
UNIQUES = {
    "uq_products_store_qr_code": ["store_id", "qr_code"],
    "uq_products_store_sku": ["store_id", "sku"],
    "uq_products_store_name_unit": ["store_id", "name", "unit"],
}


def _constraints() -> set[str]:
    return {item["name"] for item in inspect(op.get_bind()).get_unique_constraints("products")}


def _indexes() -> set[str]:
    return {item["name"] for item in inspect(op.get_bind()).get_indexes("products")}


def upgrade() -> None:
    existing = _constraints()
    for name in ("products_qr_code_key", "uq_products_store_sku", "uq_products_store_name_unit"):
        if name in existing:
            op.drop_constraint(name, "products", type_="unique")

    indexes = _indexes()
    for name, columns in UNIQUES.items():
        if name not in indexes:
            op.create_index(name, "products", columns, unique=True, postgresql_where=ACTIVE, sqlite_where=ACTIVE)


def downgrade() -> None:
    # Falla si dos tiendas ya comparten un codigo o si un borrado repite a uno activo.
    indexes = _indexes()
    for name in UNIQUES:
        if name in indexes:
            op.drop_index(name, table_name="products")
    op.create_unique_constraint("products_qr_code_key", "products", ["qr_code"])
    op.create_unique_constraint("uq_products_store_sku", "products", ["store_id", "sku"])
    op.create_unique_constraint("uq_products_store_name_unit", "products", ["store_id", "name", "unit"])
