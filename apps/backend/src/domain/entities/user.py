from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class User:
    id: UUID
    email: str
    store_id: UUID | None = None
    full_name: str | None = None
    role: str = "cashier"
    is_active: bool = True
    last_login_at: datetime | None = None
    updated_at: datetime | None = None
    password_hash: str | None = None
