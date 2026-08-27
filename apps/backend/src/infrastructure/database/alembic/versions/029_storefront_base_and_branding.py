"""add storefront fields to stores (nivel 1 generico + nivel 2 marca)

Revision ID: 029
Revises: 028
Create Date: 2026-08-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "029"
down_revision: str | None = "028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW_COLUMNS = (
    ("storefront_enabled", sa.Boolean(), False),
    ("storefront_slug", sa.String(60), None),
    ("storefront_tier", sa.String(20), "none"),
    ("storefront_logo_url", sa.String(500), None),
    ("storefront_banner_url", sa.String(500), None),
    ("storefront_color_primary", sa.String(7), None),
    ("storefront_color_secondary", sa.String(7), None),
    ("storefront_description", sa.String(280), None),
    ("storefront_whatsapp", sa.String(20), None),
)


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    for name, col_type, default in _NEW_COLUMNS:
        if name not in columns:
            nullable = default is None
            server_default = sa.false() if default is False else (sa.text(f"'{default}'") if isinstance(default, str) else None)
            op.add_column(
                "stores",
                sa.Column(name, col_type, nullable=nullable, server_default=server_default),
            )

    indexes = {ix["name"] for ix in inspect(op.get_bind()).get_indexes("stores")}
    if "ix_stores_storefront_slug" not in indexes:
        op.create_index(
            "ix_stores_storefront_slug",
            "stores",
            ["storefront_slug"],
            unique=True,
        )


def downgrade() -> None:
    indexes = {ix["name"] for ix in inspect(op.get_bind()).get_indexes("stores")}
    if "ix_stores_storefront_slug" in indexes:
        op.drop_index("ix_stores_storefront_slug", table_name="stores")

    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    for name, _col_type, _default in reversed(_NEW_COLUMNS):
        if name in columns:
            op.drop_column("stores", name)
