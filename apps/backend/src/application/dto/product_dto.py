from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

from src.domain.entities.product import product_discount_per_unit


class ProductDiscountTypeDTO(StrEnum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


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
    category_id: UUID | None = None
    min_stock: int = Field(default=1, ge=0)
    unit: str = Field(default="unidad", max_length=20)
    sku: str | None = Field(default=None, max_length=50)
    cost_price: Decimal | None = Field(default=None, ge=0)
    photo_url: str | None = Field(default=None, max_length=500)
    qr_code: str | None = Field(default=None, max_length=100)
    extra_data: dict = {}
    discount_type: ProductDiscountTypeDTO | None = None
    discount_value: Decimal = Field(default=Decimal(0), ge=0)

    @model_validator(mode="after")
    def validate_discount(self) -> "CreateProductDTO":
        if self.discount_type == ProductDiscountTypeDTO.PERCENTAGE and self.discount_value > 100:
            raise ValueError("El porcentaje de descuento no puede superar 100%")
        return self


class UpdateProductDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    category_id: UUID | None = None
    min_stock: int | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=20)
    sku: str | None = Field(default=None, max_length=50)
    cost_price: Decimal | None = Field(default=None, ge=0)
    photo_url: str | None = Field(default=None, max_length=500)
    qr_code: str | None = Field(default=None, max_length=100)
    discount_type: ProductDiscountTypeDTO | None = None
    discount_value: Decimal | None = Field(default=None, ge=0)
    # discount_type=None ya significa "no lo toques" (igual que el resto de
    # campos opcionales de este DTO), asi que se necesita una senal explicita
    # aparte para poder quitar un descuento ya configurado.
    remove_discount: bool = False

    @model_validator(mode="after")
    def validate_discount(self) -> "UpdateProductDTO":
        if self.discount_type is not None and self.discount_value is None:
            raise ValueError("El valor de descuento es requerido junto con el tipo de descuento")
        if (
            self.discount_type == ProductDiscountTypeDTO.PERCENTAGE
            and self.discount_value is not None
            and self.discount_value > 100
        ):
            raise ValueError("El porcentaje de descuento no puede superar 100%")
        return self


class StockAdjustmentDTO(BaseModel):
    quantity: int = Field(
        ...,
        ge=-1_000_000,
        le=1_000_000,
        description="Positive to add stock, negative to subtract stock",
    )
    reason: str | None = Field(default=None, max_length=120)

    @field_validator("quantity")
    @classmethod
    def validate_non_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("La cantidad debe ser mayor o menor a cero")
        return v


class ProductResponseDTO(BaseModel):
    id: UUID
    name: str
    price: Decimal
    stock: int
    category_id: UUID | None = None
    category: str | None
    qr_code: str | None
    photo_url: str | None
    min_stock: int
    unit: str
    sku: str | None = None
    cost_price: Decimal | None = None
    is_active: bool
    version: int
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)

    model_config = {"from_attributes": True}

    @computed_field  # type: ignore[prop-decorator]
    @property
    def effective_price(self) -> Decimal:
        return self.price - product_discount_per_unit(self.price, self.discount_type, self.discount_value)


class ProductCompactResponseDTO(BaseModel):
    id: UUID
    name: str
    price: Decimal
    stock: int
    unit: str
    qr_code: str | None
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)

    model_config = {"from_attributes": True}

    @computed_field  # type: ignore[prop-decorator]
    @property
    def effective_price(self) -> Decimal:
        return self.price - product_discount_per_unit(self.price, self.discount_type, self.discount_value)


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


class RowErrorDTO(BaseModel):
    row: int
    field: str
    message: str


class ImportJobResponseDTO(BaseModel):
    id: UUID
    status: str
    total_rows: int
    imported_count: int
    error_count: int
    errors: list[RowErrorDTO]
    filename: str
    created_at: datetime
    completed_at: datetime | None = None


class ImportJobListResponseDTO(BaseModel):
    items: list[ImportJobResponseDTO]
