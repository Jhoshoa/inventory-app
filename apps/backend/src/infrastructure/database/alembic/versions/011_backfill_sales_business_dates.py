"""backfill sales business dates

Revision ID: 011
Revises: 010
Create Date: 2026-05-22

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        bind.execute(
            text(
                """
                UPDATE sales AS s
                SET business_date = (s.created_at AT TIME ZONE COALESCE(st.timezone, 'America/La_Paz'))::date
                FROM stores AS st
                WHERE s.store_id = st.id
                  AND s.business_date IS NULL
                """
            )
        )
    else:
        bind.execute(
            text(
                """
                UPDATE sales
                SET business_date = DATE(created_at)
                WHERE business_date IS NULL
                """
            )
        )


def downgrade() -> None:
    pass
