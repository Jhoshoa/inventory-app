from decimal import Decimal
from pydantic import BaseModel, Field


class CreateProductDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    category: str | None = None
    min_stock: int = Field(default=5, ge=0)
    unit: str = "unidad"
    cost_price: Decimal | None = None
    extra_data: dict = {}


class UpdateProductDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    min_stock: int | None = Field(default=None, ge=0)


class ProductResponseDTO(BaseModel):
    id: str
    name: str
    price: float
    stock: int
    category: str | None
    qr_code: str | None
    photo_url: str | None
    min_stock: int

    model_config = {"from_attributes": True}
