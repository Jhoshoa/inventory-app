from dataclasses import dataclass
from uuid import UUID


@dataclass
class User:
    id: UUID
    email: str
    store_id: UUID | None = None
    full_name: str | None = None
    role: str = "cashier"
    is_active: bool = True
