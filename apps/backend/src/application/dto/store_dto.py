from uuid import UUID

from pydantic import BaseModel, Field


class StoreUpdateDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)


class StoreResponseDTO(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    phone: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}
