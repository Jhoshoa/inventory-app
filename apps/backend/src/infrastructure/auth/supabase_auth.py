from uuid import UUID

from src.config.settings import settings
from src.infrastructure.auth.supabase_client import get_supabase_admin_client


def verify_jwt(token: str) -> dict:
    if settings.DEBUG:
        # Si el token es un UUID válido, es un usuario real registrado localmente
        try:
            user_id = UUID(token)
            return {"id": user_id, "email": None, "store_id": None}
        except ValueError:
            pass
        return {
            "id": UUID("00000000-0000-0000-0000-000000000001"),
            "email": "dev@local.dev",
            "store_id": UUID("00000000-0000-0000-0000-000000000101"),
        }

    supabase = get_supabase_admin_client()
    response = supabase.auth.get_user(token)
    if not response.user:
        raise PermissionError("Token inválido o expirado")
    return {
        "id": response.user.id,
        "email": response.user.email,
        "store_id": response.user.user_metadata.get("store_id"),
    }
