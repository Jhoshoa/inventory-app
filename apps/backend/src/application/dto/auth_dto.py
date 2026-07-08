from uuid import UUID

from pydantic import BaseModel, Field


class LoginDTO(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)


class RegisterDTO(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    store_name: str = Field(..., min_length=1, max_length=100)


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

    model_config = {"from_attributes": True}
