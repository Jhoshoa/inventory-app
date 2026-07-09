"""add trial_expires_at to stores

Revision ID: 018
Revises: 017
Create Date: 2026-07-08 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    columns = _columns("stores")

    if "trial_expires_at" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "trial_expires_at",
                sa.DateTime(timezone=True),
                nullable=True,
                comment="Fecha UTC en que expira el periodo de prueba de la tienda. "
                "NULL para tiendas creadas antes de esta caracteristica.",
            ),
        )

    if "ix_stores_trial_expires" not in _indexes("stores"):
        op.create_index("ix_stores_trial_expires", "stores", ["trial_expires_at"])


def downgrade() -> None:
    indexes = _indexes("stores")
    if "ix_stores_trial_expires" in indexes:
        op.drop_index("ix_stores_trial_expires", table_name="stores")

    columns = _columns("stores")
    if "trial_expires_at" in columns:
        op.drop_column("stores", "trial_expires_at")
