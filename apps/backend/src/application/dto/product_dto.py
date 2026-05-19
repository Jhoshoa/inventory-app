from decimal import Decimal
from enum import StrEnum
from uuid import UUID
from pydantic import BaseModel, Field


class ProductStockFilter(StrEnum):
    ALL = "all"
    AVAILABLE = "available"
    LOW = "low"
    OUT = "out"


class ProductSortField(StrEnum):
    NAME = "name"
    STOCK = "stock"
    UPDATED_AT = "updated_at"
    PRICE = "price"


class SortDirection(StrEnum):
    ASC = "asc"
    DESC = "desc"


class CreateProductDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    category: str | None = None
    min_stock: int = Field(default=5, ge=0)
    unit: str = "unidad"
    sku: str | None = Field(default=None, max_length=50)
    cost_price: Decimal | None = None
    photo_url: str | None = Field(default=None, max_length=500)
    qr_code: str | None = Field(default=None, max_length=100)
    extra_data: dict = {}


class UpdateProductDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    min_stock: int | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=20)
    sku: str | None = Field(default=None, max_length=50)
    cost_price: Decimal | None = None
    photo_url: str | None = Field(default=None, max_length=500)
    qr_code: str | None = Field(default=None, max_length=100)


class StockAdjustmentDTO(BaseModel):
    quantity: int = Field(..., description="Positive to add stock, negative to subtract stock")
    reason: str | None = Field(default=None, max_length=120)


class ProductResponseDTO(BaseModel):
    id: UUID
    name: str
    price: Decimal
    stock: int
    category: str | None
    qr_code: str | None
    photo_url: str | None
    min_stock: int
    unit: str
    sku: str | None = None
    cost_price: Decimal | None = None
    is_active: bool
    version: int

    model_config = {"from_attributes": True}


class ProductCompactResponseDTO(BaseModel):
    id: UUID
    name: str
    price: Decimal
    stock: int
    unit: str
    qr_code: str | None

    model_config = {"from_attributes": True}


class ProductListResponseDTO(BaseModel):
    items: list[ProductResponseDTO]
    total: int
    limit: int
    offset: int


class ProductCompactListResponseDTO(BaseModel):
    items: list[ProductCompactResponseDTO]
    total: int
    limit: int
    offset: int
