from uuid import uuid4

from fastapi import APIRouter
from supabase import create_client

from src.application.dto.auth_dto import AuthResponseDTO, LoginDTO, RegisterDTO
from src.config.settings import settings
from src.presentation.dependencies import DEV_STORE_ID, DEV_USER_ID

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response_from_supabase(response) -> AuthResponseDTO:
    session = response.session
    user = response.user
    if not session or not user:
        raise PermissionError("Credenciales invalidas")
    return AuthResponseDTO(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "store_id": user.user_metadata.get("store_id"),
            "full_name": user.user_metadata.get("full_name"),
        },
    )


def _dev_auth_response(email: str = "dev@local.dev") -> AuthResponseDTO:
    return AuthResponseDTO(
        access_token="dev-token-123",
        refresh_token="dev-refresh-123",
        user={
            "id": str(DEV_USER_ID),
            "email": email,
            "store_id": str(DEV_STORE_ID),
            "full_name": "Dev User",
        },
    )


@router.post("/login", response_model=AuthResponseDTO)
async def login(dto: LoginDTO):
    if settings.DEBUG:
        return _dev_auth_response(dto.email)

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.sign_in_with_password(
        {"email": dto.email, "password": dto.password}
    )
    return _auth_response_from_supabase(response)


@router.post("/register", response_model=AuthResponseDTO, status_code=201)
async def register(dto: RegisterDTO):
    if settings.DEBUG:
        return _dev_auth_response(dto.email)

    store_id = str(uuid4())
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.sign_up(
        {
            "email": dto.email,
            "password": dto.password,
            "options": {
                "data": {
                    "full_name": dto.full_name,
                    "store_name": dto.store_name,
                    "store_id": store_id,
                }
            },
        }
    )
    return _auth_response_from_supabase(response)


@router.post("/refresh", response_model=AuthResponseDTO)
async def refresh_token(refresh_token: str):
    if settings.DEBUG:
        return _dev_auth_response()

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.refresh_session(refresh_token)
    return _auth_response_from_supabase(response)


@router.post("/dev-login", response_model=AuthResponseDTO)
async def dev_login():
    if not settings.DEBUG:
        raise PermissionError("Dev login is disabled")
    return _dev_auth_response()
