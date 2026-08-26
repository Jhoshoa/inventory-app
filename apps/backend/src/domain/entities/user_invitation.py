from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class UserInvitation:
    id: UUID
    store_id: UUID
    email: str
    role: str
    token_hash: str
    status: str
    expires_at: datetime
    invited_by_user_id: UUID
    accepted_by_user_id: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None
    last_sent_at: datetime | None = None
    send_count: int = 0

    def is_pending(self, *, now: datetime) -> bool:
        return self.status == "pending" and self.expires_at > now
