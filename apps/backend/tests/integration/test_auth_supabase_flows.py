"""Flujos de auth contra Supabase (DEBUG=false), con un Supabase simulado.

El resto de la suite corre con DEBUG=true, que usa una auth local de
desarrollo: sin estos tests los caminos reales (login, refresh, recuperar
contrasena, logout, validacion de tokens) no tenian ninguna cobertura.
"""

import base64
import json
import time
from types import SimpleNamespace
from uuid import uuid4

import pytest
from supabase_auth.errors import AuthApiError, AuthRetryableError

from src.config.settings import settings
from src.main import app
from src.presentation import dependencies


def make_jwt(*, exp_in: int = 3600, iat_ago: int = 0) -> str:
    def b64(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")

    now = int(time.time())
    return f"{b64({'alg': 'HS256'})}.{b64({'exp': now + exp_in, 'iat': now - iat_ago})}.firma"


def supabase_session(*, store_id: str | None = None):
    store_id = store_id or str(uuid4())
    return SimpleNamespace(
        session=SimpleNamespace(access_token=make_jwt(), refresh_token="refresh-nuevo"),
        user=SimpleNamespace(
            id=str(uuid4()),
            email="owner@tienda.com",
            user_metadata={
                "store_id": store_id,
                "store_name": "Mi Tienda",
                "full_name": "Owner",
                "role": "owner",
            },
        ),
    )


class FakeSupabase:
    """Reemplaza al cliente de Supabase: guarda las llamadas y permite forzar errores."""

    def __init__(self):
        self.calls: list[tuple] = []
        self.errors: dict[str, Exception] = {}
        self.sign_in_result = supabase_session()
        self.refresh_result = supabase_session()
        self.get_user_result = SimpleNamespace(user=SimpleNamespace(id=str(uuid4())))
        self.auth = SimpleNamespace(
            sign_in_with_password=self._method("sign_in_with_password", lambda: self.sign_in_result),
            refresh_session=self._method("refresh_session", lambda: self.refresh_result),
            reset_password_for_email=self._method("reset_password_for_email", lambda: None),
            get_user=self._method("get_user", lambda: self.get_user_result),
            admin=SimpleNamespace(
                update_user_by_id=self._method("update_user_by_id", lambda: None),
                sign_out=self._method("sign_out", lambda: None),
            ),
        )

    def _method(self, name, result):
        def call(*args):
            self.calls.append((name, *args))
            if name in self.errors:
                raise self.errors[name]
            return result()

        return call

    def called(self, name):
        return [c for c in self.calls if c[0] == name]


@pytest.fixture
def supabase(client, monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr("src.presentation.api.v1.auth.get_supabase_client", lambda: fake)
    return fake


def api_error(message: str, status: int, code: str) -> AuthApiError:
    return AuthApiError(message, status, code)


LOGIN = {"email": "owner@tienda.com", "password": "Correcta1!"}


# --- login ---------------------------------------------------------------


async def test_login_success_returns_supabase_tokens(client, supabase):
    response = await client.post("/api/v1/auth/login", json=LOGIN)

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] == supabase.sign_in_result.session.access_token
    assert body["refresh_token"] == "refresh-nuevo"
    assert body["user"]["role"] == "owner"


async def test_login_with_wrong_password_is_401_not_500(client, supabase):
    supabase.errors["sign_in_with_password"] = api_error("Invalid login credentials", 400, "invalid_credentials")

    response = await client.post("/api/v1/auth/login", json=LOGIN)

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales invalidas"


async def test_login_with_unconfirmed_email_explains_why(client, supabase):
    supabase.errors["sign_in_with_password"] = api_error("Email not confirmed", 400, "email_not_confirmed")

    response = await client.post("/api/v1/auth/login", json=LOGIN)

    assert response.status_code == 401
    assert "confirmar tu email" in response.json()["detail"]


async def test_login_when_supabase_is_unreachable_is_503(client, supabase):
    supabase.errors["sign_in_with_password"] = AuthRetryableError("Unable to reach server", 0)

    response = await client.post("/api/v1/auth/login", json=LOGIN)

    assert response.status_code == 503


# --- refresh -------------------------------------------------------------


async def test_refresh_success_returns_rotated_tokens(client, supabase):
    # El refresh siempre ocurre despues de un login: la tienda y el usuario locales ya existen.
    await client.post("/api/v1/auth/login", json=LOGIN)
    supabase.refresh_result = SimpleNamespace(
        session=SimpleNamespace(access_token=make_jwt(), refresh_token="refresh-nuevo"),
        user=supabase.sign_in_result.user,
    )

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": "viejo"})

    assert response.status_code == 200
    assert response.json()["refresh_token"] == "refresh-nuevo"
    assert supabase.called("refresh_session") == [("refresh_session", "viejo")]


async def test_refresh_with_used_token_is_401_not_500(client, supabase):
    supabase.errors["refresh_session"] = api_error(
        "Invalid Refresh Token: Already Used", 400, "refresh_token_already_used"
    )

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": "usado"})

    assert response.status_code == 401


async def test_refresh_when_supabase_is_unreachable_is_503_so_session_is_kept(client, supabase):
    supabase.errors["refresh_session"] = AuthRetryableError("Unable to reach server", 0)

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": "valido"})

    assert response.status_code == 503


# --- validacion del access token en cada request ----------------------------


@pytest.fixture
def real_token_auth(client, supabase, monkeypatch):
    """Quita el override del conftest para ejercitar get_current_user de verdad."""
    app.dependency_overrides.pop(dependencies.get_current_user, None)
    state = SimpleNamespace(calls=0, error=None)

    def fake_verify(token):
        state.calls += 1
        if state.error:
            raise state.error
        return {"id": str(dependencies.DEV_USER_ID), "email": "dev@local.dev", "store_id": str(dependencies.DEV_STORE_ID)}

    monkeypatch.setattr(dependencies, "verify_jwt", fake_verify)
    return state


async def test_expired_token_is_401_so_the_frontend_can_refresh(client, real_token_auth):
    real_token_auth.error = api_error("invalid JWT: token is expired", 401, "bad_jwt")

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {make_jwt()}"})

    assert response.status_code == 401


async def test_auth_outage_is_503_not_a_forced_logout(client, real_token_auth):
    real_token_auth.error = AuthRetryableError("Unable to reach server", 0)

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {make_jwt()}"})

    assert response.status_code == 503


async def test_valid_token_is_checked_against_supabase_once_then_cached(client, real_token_auth):
    headers = {"Authorization": f"Bearer {make_jwt()}"}

    first = await client.get("/api/v1/auth/me", headers=headers)
    second = await client.get("/api/v1/auth/me", headers=headers)

    assert first.status_code == second.status_code == 200
    assert real_token_auth.calls == 1


async def test_rejected_tokens_are_never_cached(client, real_token_auth):
    headers = {"Authorization": f"Bearer {make_jwt()}"}
    real_token_auth.error = api_error("invalid JWT", 401, "bad_jwt")
    await client.get("/api/v1/auth/me", headers=headers)

    real_token_auth.error = None
    retry = await client.get("/api/v1/auth/me", headers=headers)

    assert retry.status_code == 200
    assert real_token_auth.calls == 2
