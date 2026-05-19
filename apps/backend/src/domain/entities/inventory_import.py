from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4


class InventoryImportStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    NEEDS_REVIEW = "needs_review"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class InventoryImportItemStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPORTED = "imported"
    FAILED = "failed"


@dataclass
class InventoryImportItem:
    id: UUID
    import_id: UUID
    store_id: UUID
    row_number: int
    name: str
    price: Decimal
    stock: int
    status: str = InventoryImportItemStatus.DRAFT.value
    category: str | None = None
    sku: str | None = None
    unit: str = "unidad"
    cost_price: Decimal | None = None
    min_stock: int = 5
    confidence: Decimal | None = None
    raw_data: dict = field(default_factory=dict)
    product_id: UUID | None = None
    error_message: str | None = None

    def validate_for_review(self) -> None:
        if self.status == InventoryImportItemStatus.APPROVED.value and not self.name.strip():
            raise ValueError("El nombre es requerido para aprobar un item")
        if self.price < 0:
            raise ValueError("El precio no puede ser negativo")
        if self.stock < 0:
            raise ValueError("El stock no puede ser negativo")
        if self.min_stock < 0:
            raise ValueError("El stock minimo no puede ser negativo")


@dataclass
class InventoryImport:
    id: UUID
    store_id: UUID
    status: str
    source_filename: str | None = None
    source_content_type: str | None = None
    source_photo_url: str | None = None
    raw_text: str | None = None
    error_message: str | None = None
    items_count: int = 0
    created_by: UUID | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    confirmed_at: datetime | None = None
    items: list[InventoryImportItem] = field(default_factory=list)

    @staticmethod
    def create(
        store_id: UUID,
        *,
        created_by: UUID | None,
        source_filename: str | None,
        source_content_type: str | None,
        source_photo_url: str | None,
        raw_text: str | None,
        items: list[InventoryImportItem],
        status: str,
        error_message: str | None = None,
    ) -> "InventoryImport":
        return InventoryImport(
            id=uuid4(),
            store_id=store_id,
            status=status,
            source_filename=source_filename,
            source_content_type=source_content_type,
            source_photo_url=source_photo_url,
            raw_text=raw_text,
            error_message=error_message,
            items_count=len(items),
            created_by=created_by,
            items=items,
        )
