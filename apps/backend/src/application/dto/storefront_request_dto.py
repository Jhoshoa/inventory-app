import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

_PHONE_RE = re.compile(r"^[0-9+\s()-]{7,30}$")


class CreateStorefrontRequestDTO(BaseModel):
    customer_name: str = Field(min_length=2, max_length=150)
    customer_phone: str = Field(min_length=7, max_length=30)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("El nombre es requerido")
        return normalized

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized = value.strip()
        if not _PHONE_RE.match(normalized):
            raise ValueError("El telefono no es valido")
        return normalized

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class StorefrontRequestResponseDTO(BaseModel):
    id: UUID
    product_id: UUID | None
    product_name: str
    customer_name: str
    customer_phone: str
    note: str | None
    status: str
    payment_confirmed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StorefrontRequestListResponseDTO(BaseModel):
    items: list[StorefrontRequestResponseDTO]
    total: int
    pending_count: int
    limit: int
    offset: int


class UpdateStorefrontRequestStatusDTO(BaseModel):
    status: Literal["contacted", "closed", "pending"]


class UpdateStorefrontRequestPaymentDTO(BaseModel):
    payment_confirmed: bool
