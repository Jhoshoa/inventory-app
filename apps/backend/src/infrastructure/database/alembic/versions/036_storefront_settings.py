"""add storefront_settings to stores (ajustes del catalogo publico)

Revision ID: 036
Revises: 035
Create Date: 2026-11-05

Announcement bar, visible sections, product display, delivery options,
contact, social links and opening hours. They live in one JSON column,
validated by StorefrontSettingsDTO, so the catalog templates planned next can
add their own settings without a migration each. NULL means "defaults".
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "036"
down_revision: str | None = "035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    if "storefront_settings" not in columns:
        op.add_column("stores", sa.Column("storefront_settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("stores")}
    if "storefront_settings" in columns:
        op.drop_column("stores", "storefront_settings")
