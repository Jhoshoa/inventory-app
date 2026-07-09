"""add subscription columns to stores

Revision ID: 019
Revises: 018
Create Date: 2026-07-09 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    columns = _columns("stores")

    if "access_status" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "access_status",
                sa.String(20),
                nullable=False,
                server_default="active",
                comment="Estado tecnico: active, suspended, archived, purged",
            ),
        )

    if "subscription_status" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "subscription_status",
                sa.String(20),
                nullable=False,
                server_default="trial",
                comment="Estado comercial: trial, active, past_due, canceled, expired",
            ),
        )

    if "next_billing_date" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "next_billing_date",
                sa.DateTime(timezone=True),
                nullable=True,
                comment="Proximo pago (active) o fin de servicio (canceled)",
            ),
        )

    if "grace_period_started_at" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "grace_period_started_at",
                sa.DateTime(timezone=True),
                nullable=True,
                comment="Cuando empezo la mora. Se setea al entrar en past_due",
            ),
        )

    if "subscription_started_at" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "subscription_started_at",
                sa.DateTime(timezone=True),
                nullable=True,
                comment="Cuando empezo a pagar (primera conversion trial -> active)",
            ),
        )

    if "billing_email" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "billing_email",
                sa.String(255),
                nullable=True,
                comment="Email de facturacion (puede diferir del owner)",
            ),
        )

    if "billing_nit" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "billing_nit",
                sa.String(50),
                nullable=True,
                comment="NIT para facturacion (clientes Bolivia)",
            ),
        )

    if "billing_razon_social" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "billing_razon_social",
                sa.String(255),
                nullable=True,
                comment="Razon social para facturacion",
            ),
        )

    if "ix_stores_subscription_status" not in _indexes("stores"):
        op.create_index("ix_stores_subscription_status", "stores", ["subscription_status"])

    if "ix_stores_access_status" not in _indexes("stores"):
        op.create_index("ix_stores_access_status", "stores", ["access_status"])

    op.execute(
        """UPDATE stores
           SET access_status = 'active',
               subscription_status = 'active'
           WHERE trial_expires_at IS NULL
             AND is_active = TRUE"""
    )

    op.execute(
        """UPDATE stores
           SET access_status = 'active',
               subscription_status = 'trial'
           WHERE trial_expires_at IS NOT NULL
             AND is_active = TRUE"""
    )

    op.execute(
        """UPDATE stores
           SET access_status = 'suspended',
               subscription_status = 'expired'
           WHERE is_active = FALSE"""
    )


def downgrade() -> None:
    indexes = _indexes("stores")
    for idx in ("ix_stores_subscription_status", "ix_stores_access_status"):
        if idx in indexes:
            op.drop_index(idx, table_name="stores")

    columns = _columns("stores")
    for col in (
        "access_status",
        "subscription_status",
        "next_billing_date",
        "grace_period_started_at",
        "subscription_started_at",
        "billing_email",
        "billing_nit",
        "billing_razon_social",
    ):
        if col in columns:
            op.drop_column("stores", col)
