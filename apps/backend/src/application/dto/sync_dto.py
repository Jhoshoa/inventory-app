from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SyncEntity(StrEnum):
    PRODUCT = "product"
    SALE = "sale"
    STOCK_MOVEMENT = "stock_movement"


class SyncOperation(StrEnum):
    UPSERT = "upsert"
    DELETE = "delete"
    CREATE = "create"


class SyncResultStatus(StrEnum):
    ACCEPTED = "accepted"
    DUPLICATE = "duplicate"
    REJECTED = "rejected"
    CONFLICT = "conflict"


class SyncErrorDTO(BaseModel):
    code: str
    detail: str


class SyncChangeDTO(BaseModel):
    client_change_id: str = Field(..., min_length=1, max_length=120)
    entity: SyncEntity
    operation: SyncOperation
    entity_id: UUID
    client_created_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)


class SyncPushDTO(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    changes: list[SyncChangeDTO] = Field(..., min_length=1)


class SyncChangeResultDTO(BaseModel):
    client_change_id: str
    entity: SyncEntity
    operation: SyncOperation
    entity_id: UUID
    status: SyncResultStatus
    server_version: int | None = None
    server_updated_at: datetime | None = None
    error: SyncErrorDTO | None = None


class SyncPushResponseDTO(BaseModel):
    results: list[SyncChangeResultDTO]
    server_time: datetime


class SyncPullDTO(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    since: datetime


class SyncPullChangeDTO(BaseModel):
    entity: SyncEntity
    operation: SyncOperation
    entity_id: UUID
    server_version: int | None = None
    server_updated_at: datetime
    payload: dict[str, Any]


class SyncPullResponseDTO(BaseModel):
    changes: list[SyncPullChangeDTO]
    server_time: datetime


class ProductSyncPayloadDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    category: str | None = None
    min_stock: int = Field(default=5, ge=0)
    unit: str = "unidad"
    sku: str | None = None
    cost_price: Decimal | None = None
    photo_url: str | None = None
    qr_code: str | None = None


class SaleItemSyncPayloadDTO(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)


class SaleSyncPayloadDTO(BaseModel):
    payment_method: str = "efectivo"
    customer_name: str | None = Field(default=None, max_length=100)
    items: list[SaleItemSyncPayloadDTO] = Field(..., min_length=1)
    created_at: datetime | None = None


class StockMovementSyncPayloadDTO(BaseModel):
    product_id: UUID
    quantity_delta: int
    movement_type: str = Field(default="manual_adjustment", max_length=40)
    reason: str | None = Field(default=None, max_length=120)
    created_at: datetime | None = None
