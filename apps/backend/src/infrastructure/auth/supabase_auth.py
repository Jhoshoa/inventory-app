from src.config.settings import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def verify_jwt(token: str) -> dict:
    response = supabase.auth.get_user(token)
    if not response.user:
        raise PermissionError("Token inválido o expirado")
    return {
        "id": response.user.id,
        "email": response.user.email,
        "store_id": response.user.user_metadata.get("store_id"),
    }
