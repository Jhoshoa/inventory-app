from urllib.parse import parse_qs, urlparse

from supabase import create_client

from src.config.settings import settings
from src.infrastructure.auth.supabase_client import _stateless_options
from src.presentation.api.v1 import auth as auth_api

# Formato de una anon key (JWT) para que el SDK la acepte; no se llama a la red.
FAKE_ANON_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl"


async def test_google_login_always_shows_the_account_chooser(client, monkeypatch):
    """Tras "Salir", volver a entrar con Google debe dejar elegir la cuenta:
    sin prompt=select_account Google entra directo con la sesion del navegador."""
    real_client = create_client("https://example.supabase.co", FAKE_ANON_KEY, options=_stateless_options())
    monkeypatch.setattr(auth_api, "get_supabase_client", lambda: real_client)
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")

    response = await client.post("/api/v1/auth/oauth/google")

    assert response.status_code == 200
    url = urlparse(response.json()["url"])
    query = parse_qs(url.query)
    assert url.path == "/auth/v1/authorize"
    assert query["provider"] == ["google"]
    assert query["prompt"] == ["select_account"]
    assert query["redirect_to"][0].startswith(f"{settings.FRONTEND_URL}/auth/callback?state=")
