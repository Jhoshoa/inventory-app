from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class StockMovementResponseDTO(BaseModel):
    id: UUID
    product_id: UUID
    sale_id: UUID | None = None
    movement_type: str
    quantity_delta: int
    stock_after: int
    reason: str | None = None
    device_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockMovementListResponseDTO(BaseModel):
    items: list[StockMovementResponseDTO]
    total: int
    limit: int
    offset: int
