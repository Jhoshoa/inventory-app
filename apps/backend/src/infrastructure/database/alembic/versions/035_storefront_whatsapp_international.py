"""store storefront_whatsapp as an international number (country code included)

Revision ID: 035
Revises: 034
Create Date: 2026-11-05

wa.me only opens a chat with the international number. Until now the field
took whatever the owner typed (usually the 8-digit Bolivian mobile, as the
form suggested), so every "Contactar por WhatsApp" link was broken. The API
now requires the country code; this normalizes what is already stored:
only digits are kept and 8-digit numbers, the local Bolivian format every
existing store used, get the 591 prefix. Anything else keeps its digits.
"""

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "035"
down_revision: str | None = "034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BOLIVIA_CODE = "591"


def normalize_whatsapp(raw: str | None) -> str | None:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 8:
        digits = _BOLIVIA_CODE + digits
    return digits or None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, storefront_whatsapp FROM stores WHERE storefront_whatsapp IS NOT NULL")
    ).fetchall()
    for store_id, raw in rows:
        normalized = normalize_whatsapp(raw)
        if normalized != raw:
            bind.execute(
                sa.text("UPDATE stores SET storefront_whatsapp = :value WHERE id = :id"),
                {"value": normalized, "id": store_id},
            )


def downgrade() -> None:
    # Irreversible by design: the original formatting is not needed and the
    # international numbers keep working with the previous code.
    pass
