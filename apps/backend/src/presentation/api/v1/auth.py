from uuid import uuid4
from fastapi import APIRouter, HTTPException
from src.application.dto.auth_dto import LoginDTO, RegisterDTO, AuthResponseDTO
from src.config.settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponseDTO)
async def login(dto: LoginDTO):
    raise NotImplementedError("Supabase Auth")


@router.post("/register", response_model=AuthResponseDTO)
async def register(dto: RegisterDTO):
    raise NotImplementedError("Supabase Auth")


@router.post("/refresh", response_model=AuthResponseDTO)
async def refresh_token(refresh_token: str):
    raise NotImplementedError("Supabase Auth")


if settings.DEBUG:

    @router.post("/dev-login", response_model=AuthResponseDTO)
    async def dev_login():
        return AuthResponseDTO(
            access_token="dev-token-123",
            refresh_token="dev-refresh-123",
            user={
                "id": str(uuid4()),
                "email": "dev@local.dev",
                "store_id": str(uuid4()),
            },
        )
