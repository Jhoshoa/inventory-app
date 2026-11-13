from types import SimpleNamespace

from src.config.settings import settings
from src.presentation.api.v1 import auth as auth_api


class _FakeAuth:
    def __init__(self):
        self.calls: list[dict] = []

    def sign_up(self, credentials: dict):
        self.calls.append(credentials)
        return SimpleNamespace(session=None, user=SimpleNamespace(id="u1"))


async def test_the_confirmation_email_returns_to_login_with_the_confirmed_notice(client, monkeypatch):
    fake = _FakeAuth()
    monkeypatch.setattr(auth_api, "get_supabase_client", lambda: SimpleNamespace(auth=fake))
    monkeypatch.setattr(settings, "DEBUG", False)

    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "rosa@tienda.com", "password": "Prueba123!", "full_name": "Rosa", "store_name": "Tienda Rosa"},
    )

    assert response.status_code == 201, response.text
    options = fake.calls[0]["options"]
    # El SDK de Supabase solo lee esta clave para el enlace del correo.
    assert options["email_redirect_to"] == f"{settings.FRONTEND_URL}/login?verified=true"
    assert "redirect_to" not in options
