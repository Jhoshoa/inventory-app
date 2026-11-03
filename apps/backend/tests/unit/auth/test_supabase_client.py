import pytest

from src.infrastructure.auth import supabase_client


@pytest.fixture(autouse=True)
def fresh_clients(monkeypatch):
    monkeypatch.setattr(supabase_client, "_client", None)
    monkeypatch.setattr(supabase_client, "_admin_client", None)


@pytest.mark.parametrize("factory", ["get_supabase_client", "get_supabase_admin_client"])
def test_backend_never_keeps_or_refreshes_user_sessions(factory):
    """Con los defaults del SDK, cada login deja un timer que renueva (y rota) en
    segundo plano el refresh token que ya recibio el navegador, y la sesion de
    un usuario se cae sola. El cliente del backend tiene que ser sin estado."""
    auth = getattr(supabase_client, factory)().auth

    assert auth._auto_refresh_token is False
    assert auth._persist_session is False
