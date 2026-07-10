"""create pkce_verifiers table for multi-worker OAuth support

Revision ID: 022
Revises: 021
Create Date: 2026-07-10 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "pkce_verifiers" not in tables:
        op.create_table(
            "pkce_verifiers",
            sa.Column("state", sa.String(255), primary_key=True),
            sa.Column("code_verifier", sa.Text(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_pkce_verifiers_created_at", "pkce_verifiers", ["created_at"])


def downgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "pkce_verifiers" in tables:
        op.drop_index("ix_pkce_verifiers_created_at", table_name="pkce_verifiers")
        op.drop_table("pkce_verifiers")
