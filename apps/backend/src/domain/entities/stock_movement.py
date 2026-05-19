from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class StockMovement:
    id: UUID
    store_id: UUID
    product_id: UUID
    sale_id: UUID | None
    movement_type: str
    quantity_delta: int
    stock_after: int
    reason: str | None
    device_id: str | None
    created_at: datetime
