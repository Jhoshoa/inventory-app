from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from src.domain.entities.product_batch import BatchStatus, ProductBatch


class ProductBatchResponseDTO(BaseModel):
    id: UUID
    product_id: UUID
    expires_on: date
    alert_days: int
    quantity_initial: int
    quantity_remaining: int
    created_at: datetime
    days_left: int
    status: BatchStatus
    product_name: str | None = None
    product_unit: str | None = None

    @staticmethod
    def from_entity(batch: ProductBatch, today: date) -> "ProductBatchResponseDTO":
        return ProductBatchResponseDTO(
            id=batch.id,
            product_id=batch.product_id,
            expires_on=batch.expires_on,
            alert_days=batch.alert_days,
            quantity_initial=batch.quantity_initial,
            quantity_remaining=batch.quantity_remaining,
            created_at=batch.created_at,
            days_left=batch.days_left(today),
            status=batch.status(today),
            product_name=batch.product_name,
            product_unit=batch.product_unit,
        )


class ProductBatchListResponseDTO(BaseModel):
    items: list[ProductBatchResponseDTO]
    # Unidades del producto sin fecha de vencimiento conocida.
    untracked_quantity: int
    today: date
