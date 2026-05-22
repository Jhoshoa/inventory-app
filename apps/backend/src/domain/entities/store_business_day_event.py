from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass
class StoreBusinessDayEvent:
    id: UUID
    business_day_id: UUID
    store_id: UUID
    event_type: str
    created_by_user_id: UUID
    note: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(
        *,
        business_day_id: UUID,
        store_id: UUID,
        event_type: str,
        created_by_user_id: UUID,
        note: str | None = None,
    ) -> "StoreBusinessDayEvent":
        if event_type not in {"open", "close", "reopen"}:
            raise ValueError("Tipo de evento de jornada invalido")
        return StoreBusinessDayEvent(
            id=uuid4(),
            business_day_id=business_day_id,
            store_id=store_id,
            event_type=event_type,
            created_by_user_id=created_by_user_id,
            note=note,
        )
