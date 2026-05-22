from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CreateProductCategoryDTO(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    sku_prefix: str = Field(min_length=1, max_length=8)

    @field_validator("sku_prefix")
    @classmethod
    def validate_sku_prefix(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized.isalnum():
            raise ValueError("El prefijo SKU solo puede tener letras y numeros")
        return normalized


class UpdateProductCategoryDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    sku_prefix: str | None = Field(default=None, min_length=1, max_length=8)

    @field_validator("sku_prefix")
    @classmethod
    def validate_sku_prefix(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not normalized.isalnum():
            raise ValueError("El prefijo SKU solo puede tener letras y numeros")
        return normalized


class ProductCategoryResponseDTO(BaseModel):
    id: UUID
    name: str
    sku_prefix: str
    next_sku_number: int
    is_active: bool


class ProductCategoryListResponseDTO(BaseModel):
    items: list[ProductCategoryResponseDTO]
