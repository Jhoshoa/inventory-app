import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,}$")


class LoginDTO(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Email invalido")
        return v


class RegisterDTO(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1, max_length=100)
    store_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Email invalido")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(
                "Password debe tener al menos 8 caracteres, una mayuscula, "
                "una minuscula, un numero y un caracter especial"
            )
        return v


class RefreshTokenDTO(BaseModel):
    refresh_token: str


class OAuthCallbackDTO(BaseModel):
    code: str
    state: str | None = None


class RegisterSuccessDTO(BaseModel):
    success: bool = True
    message: str


class AuthResponseDTO(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class CurrentUserDTO(BaseModel):
    id: UUID
    email: str
    store_id: UUID
    full_name: str | None = None
    role: str
    is_active: bool
    trial_expires_at: datetime | None = None
    days_until_trial_ends: int | None = None
    subscription_status: str = "trial"
    access_status: str = "active"

    model_config = {"from_attributes": True}
