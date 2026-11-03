from supabase import ClientOptions, create_client

from src.config.settings import settings

_client: object = None
_admin_client: object = None


def _stateless_options() -> ClientOptions:
    """El backend nunca debe guardar ni renovar sesiones de usuarios por su cuenta.

    Con los defaults del SDK (auto_refresh_token=True, persist_session=True), cada
    login/refresh deja una sesion en este cliente compartido y arranca un timer que
    la renueva en segundo plano. Ese refresh rota el refresh token en Supabase: el
    que ya recibio el navegador queda invalidado y la sesion del usuario se cae.
    """
    return ClientOptions(auto_refresh_token=False, persist_session=False)


def get_supabase_client():
    global _client
    if _client is None:
        _client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY, options=_stateless_options()
        )
    return _client


def get_supabase_admin_client():
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, options=_stateless_options()
        )
    return _admin_client
