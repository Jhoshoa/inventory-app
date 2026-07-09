"""fix stores incorrectly set to trial with expired trial_expires_at

Stores that had is_active = True and an already-expired trial_expires_at
were incorrectly set to subscription_status = 'trial' by migration 019,
causing GetCurrentUserContextUseCase to block them on every request.

These stores should be treated as active subscribers since they were
already using the app with is_active = True.

Revision ID: 021
Revises: 020
Create Date: 2026-07-09 13:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """UPDATE stores
           SET subscription_status = 'active'
           WHERE subscription_status = 'trial'
             AND trial_expires_at IS NOT NULL
             AND trial_expires_at < NOW()"""
    )


def downgrade() -> None:
    pass
