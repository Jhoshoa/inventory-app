from uuid import UUID

from supabase import create_client

from src.config.settings import settings


def verify_jwt(token: str) -> dict:
    if settings.DEBUG:
        return {
            "id": UUID("00000000-0000-0000-0000-000000000001"),
            "email": "dev@local.dev",
            "store_id": UUID("00000000-0000-0000-0000-000000000101"),
        }

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    response = supabase.auth.get_user(token)
    if not response.user:
        raise PermissionError("Token inválido o expirado")
    return {
        "id": response.user.id,
        "email": response.user.email,
        "store_id": response.user.user_metadata.get("store_id"),
    }
