"""add unique constraint on (store_id, name, unit)

Revision ID: 017
Revises: 016
Create Date: 2026-07-08 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Remove duplicates: keep the row with the lowest created_at per (store_id, name, unit)
    conn.execute(
        text("""
            DELETE FROM products
            WHERE id IN (
                SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY store_id, name, unit
                               ORDER BY created_at ASC
                           ) AS rn
                    FROM products
                    WHERE deleted_at IS NULL
                ) ranked
                WHERE ranked.rn > 1
            )
        """)
    )

    op.create_index(
        "ix_products_store_name_unit",
        "products",
        ["store_id", "name", "unit"],
    )
    op.create_unique_constraint(
        "uq_products_store_name_unit",
        "products",
        ["store_id", "name", "unit"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_products_store_name_unit", "products", type_="unique")
    op.drop_index("ix_products_store_name_unit", table_name="products")
