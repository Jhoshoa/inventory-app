import re
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_RE = re.compile(r"^[0-9+\s()-]{7,30}$")


class LeadCreateDTO(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=30)
    store_name: str | None = Field(default=None, max_length=150)
    email: str | None = Field(default=None, max_length=255)
    business_type: str | None = Field(default=None, max_length=100)
    message: str | None = Field(default=None, max_length=1000)
    source_page: str | None = Field(default=None, max_length=255)
    # Honeypot: campo invisible para usuarios reales. Si llega con contenido, es un bot.
    website: str | None = Field(default=None, max_length=255)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("El nombre es requerido")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized = value.strip()
        if not _PHONE_RE.match(normalized):
            raise ValueError("El telefono no es valido")
        return normalized

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not normalized:
            return None
        if not _EMAIL_RE.match(normalized):
            raise ValueError("El correo no es valido")
        return normalized

    @field_validator("store_name", "business_type", "message", "source_page")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @property
    def is_spam(self) -> bool:
        return bool(self.website and self.website.strip())


class LeadResponseDTO(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}
