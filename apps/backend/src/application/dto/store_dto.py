import re
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$")
_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class StoreUpdateDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    allow_percentage_discount: bool | None = None
    max_percentage_discount: Decimal | None = Field(default=None, ge=0, le=100)
    allow_manual_discount: bool | None = None
    max_manual_discount_amount: Decimal | None = Field(default=None, ge=0)
    allow_cashier_discount_override: bool | None = None
    storefront_enabled: bool | None = None
    storefront_slug: str | None = Field(default=None, min_length=3, max_length=60)
    storefront_logo_url: str | None = Field(default=None, max_length=500)
    storefront_banner_url: str | None = Field(default=None, max_length=500)
    storefront_color_primary: str | None = None
    storefront_color_secondary: str | None = None
    storefront_description: str | None = Field(default=None, max_length=280)
    storefront_whatsapp: str | None = Field(default=None, max_length=20)

    @field_validator("storefront_slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not _SLUG_RE.match(v):
            raise ValueError(
                "El slug solo puede tener minusculas, numeros y guiones, sin empezar ni terminar en guion"
            )
        return v

    @field_validator("storefront_color_primary", "storefront_color_secondary")
    @classmethod
    def validate_hex_color(cls, v: str | None) -> str | None:
        # "" pasa sin tocar (se interpreta como "borrar" en el use case, igual
        # que address/phone) — solo se valida el formato cuando trae un valor.
        if v is None or v == "":
            return v
        if not _HEX_COLOR_RE.match(v):
            raise ValueError("El color debe ser un hex valido, ej. #2563EB")
        return v


class StoreResponseDTO(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    phone: str | None = None
    is_active: bool
    allow_percentage_discount: bool = False
    max_percentage_discount: Decimal = Decimal(0)
    allow_manual_discount: bool = False
    max_manual_discount_amount: Decimal = Decimal(0)
    allow_cashier_discount_override: bool = False
    storefront_enabled: bool = False
    storefront_slug: str | None = None
    storefront_tier: str = "none"
    storefront_logo_url: str | None = None
    storefront_banner_url: str | None = None
    storefront_color_primary: str | None = None
    storefront_color_secondary: str | None = None
    storefront_description: str | None = None
    storefront_whatsapp: str | None = None

    model_config = {"from_attributes": True}
