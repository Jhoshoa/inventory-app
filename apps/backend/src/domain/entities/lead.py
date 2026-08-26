from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4


@dataclass
class Lead:
    id: UUID
    name: str
    phone: str
    store_name: str | None = None
    email: str | None = None
    business_type: str | None = None
    message: str | None = None
    source_page: str | None = None
    created_at: datetime | None = None

    @staticmethod
    def create(
        *,
        name: str,
        phone: str,
        store_name: str | None = None,
        email: str | None = None,
        business_type: str | None = None,
        message: str | None = None,
        source_page: str | None = None,
    ) -> "Lead":
        return Lead(
            id=uuid4(),
            name=name,
            phone=phone,
            store_name=store_name,
            email=email,
            business_type=business_type,
            message=message,
            source_page=source_page,
            created_at=datetime.now(UTC),
        )
