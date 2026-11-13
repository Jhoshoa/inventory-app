import re
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.entities.product_batch import DEFAULT_ALERT_DAYS, MAX_ALERT_DAYS

from src.application.dto.storefront_settings_dto import StorefrontSettingsDTO
from src.domain.value_objects.phone import normalize_phone

_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$")
_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class StoreUpdateDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    allow_percentage_discount: bool | None = None
    max_percentage_discount: Decimal | None = Field(default=None, ge=0, le=100)
    allow_manual_discount: bool | None = None
    max_manual_discount_amount: Decimal | None = Field(default=None, ge=0)
    allow_cashier_discount_override: bool | None = None
    # Aviso de vencimiento por defecto para los lotes nuevos.
    default_alert_days: int | None = Field(default=None, ge=0, le=MAX_ALERT_DAYS)
    storefront_enabled: bool | None = None
    storefront_slug: str | None = Field(default=None, min_length=3, max_length=60)
    storefront_color_primary: str | None = None
    storefront_color_secondary: str | None = None
    storefront_description: str | None = Field(default=None, max_length=280)
    storefront_whatsapp: str | None = Field(default=None, max_length=30)
    storefront_payment_instructions: str | None = Field(default=None, max_length=280)
    # Reemplaza todos los ajustes del catalogo de una vez (el formulario los manda completos).
    storefront_settings: StorefrontSettingsDTO | None = None

    @field_validator("phone", "storefront_whatsapp")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        # Se guardan solo los digitos con codigo de pais (wa.me lo necesita;
        # sin codigo se asume Bolivia). "" sigue significando "borrar".
        if v is None or v.strip() == "":
            return v
        return normalize_phone(v)

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
    # Solo lectura en Configuracion: cambiarla moveria los dias de venta y cierres.
    timezone: str = "America/La_Paz"
    allow_percentage_discount: bool = False
    max_percentage_discount: Decimal = Decimal(0)
    allow_manual_discount: bool = False
    max_manual_discount_amount: Decimal = Decimal(0)
    allow_cashier_discount_override: bool = False
    default_alert_days: int = DEFAULT_ALERT_DAYS
    storefront_enabled: bool = False
    storefront_slug: str | None = None
    storefront_tier: str = "none"
    storefront_logo_url: str | None = None
    storefront_banner_url: str | None = None
    storefront_color_primary: str | None = None
    storefront_color_secondary: str | None = None
    storefront_description: str | None = None
    storefront_whatsapp: str | None = None
    storefront_payment_qr_url: str | None = None
    storefront_payment_instructions: str | None = None
    storefront_settings: StorefrontSettingsDTO = Field(default_factory=StorefrontSettingsDTO)

    model_config = {"from_attributes": True}

    @field_validator("storefront_settings", mode="before")
    @classmethod
    def default_settings(cls, v: object) -> object:
        # NULL en la base (tienda que nunca guardo ajustes) = valores por defecto.
        if v is None:
            return {}
        try:
            return StorefrontSettingsDTO.model_validate(v)
        except ValueError:
            return {}
