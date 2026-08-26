import re
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.application.dto.user_dto import UserRoleDTO

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,}$")


class InvitationStatusDTO(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"
    EXPIRED = "expired"


class CreateUserInvitationDTO(BaseModel):
    email: str = Field(..., max_length=255)
    role: UserRoleDTO = UserRoleDTO.CASHIER

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Email invalido")
        return v.lower()


class UserInvitationResponseDTO(BaseModel):
    id: UUID
    store_id: UUID
    email: str
    role: str
    status: str
    expires_at: datetime
    invited_by_user_id: UUID
    accepted_by_user_id: UUID | None = None
    created_at: datetime | None = None
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None
    last_sent_at: datetime | None = None
    send_count: int = 0

    model_config = {"from_attributes": True}


class UserInvitationCreatedDTO(UserInvitationResponseDTO):
    dev_invite_url: str | None = None


class UserInvitationListResponseDTO(BaseModel):
    items: list[UserInvitationResponseDTO]
    total: int
    limit: int
    offset: int


class UserInvitationPreviewDTO(BaseModel):
    email: str
    store_name: str
    role: str
    status: str
    expires_at: datetime


class AcceptUserInvitationDTO(BaseModel):
    token: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(
                "Password debe tener al menos 8 caracteres, una mayuscula, "
                "una minuscula, un numero y un caracter especial"
            )
        return v
