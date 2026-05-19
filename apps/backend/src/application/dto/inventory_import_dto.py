from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class InventoryImportStatusDTO(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    NEEDS_REVIEW = "needs_review"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class InventoryImportItemStatusDTO(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPORTED = "imported"
    FAILED = "failed"


class InventoryImportItemResponseDTO(BaseModel):
    id: UUID
    import_id: UUID
    status: str
    row_number: int
    name: str
    category: str | None = None
    sku: str | None = None
    unit: str
    price: Decimal
    cost_price: Decimal | None = None
    stock: int
    min_stock: int
    confidence: Decimal | None = None
    raw_data: dict = Field(default_factory=dict)
    product_id: UUID | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}


class InventoryImportResponseDTO(BaseModel):
    id: UUID
    status: str
    source_filename: str | None = None
    source_content_type: str | None = None
    source_photo_url: str | None = None
    raw_text: str | None = None
    error_message: str | None = None
    items_count: int
    items: list[InventoryImportItemResponseDTO] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class InventoryImportListResponseDTO(BaseModel):
    items: list[InventoryImportResponseDTO]
    total: int
    limit: int
    offset: int


class UpdateInventoryImportItemDTO(BaseModel):
    status: InventoryImportItemStatusDTO | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    sku: str | None = Field(default=None, max_length=50)
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    min_stock: int | None = Field(default=None, ge=0)


class ConfirmInventoryImportResponseDTO(BaseModel):
    import_id: UUID
    status: str
    created_products: int
    failed_items: int = 0
