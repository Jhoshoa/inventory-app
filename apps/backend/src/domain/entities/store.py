from dataclasses import dataclass
from datetime import date
from uuid import UUID, uuid4


@dataclass
class Store:
    id: UUID
    name: str
    address: str | None = None
    phone: str | None = None
    is_active: bool = True
    timezone: str = "America/La_Paz"
    first_business_date: date | None = None

    @staticmethod
    def create(name: str, address: str | None = None, phone: str | None = None) -> "Store":
        return Store(id=uuid4(), name=name, address=address, phone=phone)
