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
    monkeypatch.setattr(settings, "AUTH_GOOGLE_ENABLED", True)

    response = await client.post("/api/v1/auth/oauth/google")

    assert response.status_code == 200
    url = urlparse(response.json()["url"])
    query = parse_qs(url.query)
    assert url.path == "/auth/v1/authorize"
    assert query["provider"] == ["google"]
    assert query["prompt"] == ["select_account"]
    assert query["redirect_to"][0].startswith(f"{settings.FRONTEND_URL}/auth/callback?state=")


async def test_the_browser_gets_the_public_auth_url_not_the_internal_one(client, monkeypatch):
    # Auth en el mismo servidor: el SDK arma la URL con la red interna de Docker.
    internal = "http://inventory-auth-gateway:8000"
    real_client = create_client(internal, FAKE_ANON_KEY, options=_stateless_options())
    monkeypatch.setattr(auth_api, "get_supabase_client", lambda: real_client)
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "AUTH_GOOGLE_ENABLED", True)
    monkeypatch.setattr(settings, "SUPABASE_URL", internal)
    monkeypatch.setattr(settings, "SUPABASE_PUBLIC_URL", "https://tutiendamiga.digital")

    response = await client.post("/api/v1/auth/oauth/google")

    url = response.json()["url"]
    assert url.startswith("https://tutiendamiga.digital/auth/v1/authorize?")
    assert "inventory-auth-gateway" not in url


async def test_without_google_enabled_the_owner_gets_a_clear_message(client, monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "AUTH_GOOGLE_ENABLED", False)

    response = await client.post("/api/v1/auth/oauth/google")

    assert response.status_code == 400
    assert "Google no está activado" in response.json()["detail"]


def test_public_auth_url_leaves_other_urls_alone(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "http://inventory-auth-gateway:8000")
    monkeypatch.setattr(settings, "SUPABASE_PUBLIC_URL", "")
    assert auth_api.public_auth_url("http://inventory-auth-gateway:8000/auth/v1/authorize?x=1") == (
        "http://inventory-auth-gateway:8000/auth/v1/authorize?x=1"
    )
    monkeypatch.setattr(settings, "SUPABASE_PUBLIC_URL", "https://tutiendamiga.digital/")
    assert auth_api.public_auth_url("https://accounts.google.com/o/oauth2") == "https://accounts.google.com/o/oauth2"
