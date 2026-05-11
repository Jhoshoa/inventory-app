from pydantic import BaseModel, Field


class LoginDTO(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)


class RegisterDTO(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    store_name: str = Field(..., min_length=1, max_length=100)


class AuthResponseDTO(BaseModel):
    access_token: str
    refresh_token: str
    user: dict
