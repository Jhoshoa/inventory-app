from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel


class UserRoleDTO(StrEnum):
    OWNER = "owner"
    CASHIER = "cashier"


class UserResponseDTO(BaseModel):
    id: UUID
    email: str
    store_id: UUID | None = None
    full_name: str | None = None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserListResponseDTO(BaseModel):
    items: list[UserResponseDTO]
    total: int
    limit: int
    offset: int


class UpdateUserRoleDTO(BaseModel):
    role: UserRoleDTO


class UpdateUserStatusDTO(BaseModel):
    is_active: bool
