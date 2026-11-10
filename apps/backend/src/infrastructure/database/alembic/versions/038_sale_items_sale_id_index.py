"""index sale_items.sale_id (orden "Mas pedidos" del catalogo)

Revision ID: 038
Revises: 037
Create Date: 2026-11-10

The storefront "Mas pedidos" order sums sale_items of the store's completed
sales from the last 90 days, joining sale_items to sales by sale_id. Postgres
does not index foreign keys on its own, so that join had to scan sale_items.
"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import inspect

revision: str = "038"
down_revision: str | None = "037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_index(table: str, name: str) -> bool:
    return any(index["name"] == name for index in inspect(op.get_bind()).get_indexes(table))


def upgrade() -> None:
    if not _has_index("sale_items", "ix_sale_items_sale_id"):
        op.create_index("ix_sale_items_sale_id", "sale_items", ["sale_id"])


def downgrade() -> None:
    if _has_index("sale_items", "ix_sale_items_sale_id"):
        op.drop_index("ix_sale_items_sale_id", table_name="sale_items")
