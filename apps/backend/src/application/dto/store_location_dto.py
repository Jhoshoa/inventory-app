from uuid import UUID

from pydantic import BaseModel, Field

from src.domain.entities.store_location import (
    LEVEL_MAX_LENGTH,
    MAX_LOCATIONS_PER_PRODUCT,
    SHELF_MAX_LENGTH,
    ZONE_MAX_LENGTH,
    ProductLocationKind,
)


class StoreLocationInputDTO(BaseModel):
    zone: str = Field(min_length=1, max_length=ZONE_MAX_LENGTH)
    shelf: str | None = Field(default=None, max_length=SHELF_MAX_LENGTH)
    level: str | None = Field(default=None, max_length=LEVEL_MAX_LENGTH)


class StoreLocationResponseDTO(BaseModel):
    id: UUID
    zone: str
    shelf: str | None = None
    level: str | None = None
    label: str
    product_count: int = 0


class StoreLocationListResponseDTO(BaseModel):
    items: list[StoreLocationResponseDTO]


class ProductLocationResponseDTO(BaseModel):
    id: UUID
    label: str
    zone: str
    shelf: str | None = None
    level: str | None = None
    kind: ProductLocationKind


class ProductLocationItemDTO(BaseModel):
    location_id: UUID
    kind: ProductLocationKind = ProductLocationKind.DISPLAY


class SetProductLocationsDTO(BaseModel):
    items: list[ProductLocationItemDTO] = Field(default_factory=list, max_length=MAX_LOCATIONS_PER_PRODUCT)
