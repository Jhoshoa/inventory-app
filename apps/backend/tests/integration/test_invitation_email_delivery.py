from src.application.exceptions import EmailDeliveryError
from src.application.ports.email_sender import IEmailSender
from src.config.settings import settings
from src.main import app
from src.presentation import dependencies


class _FailingSender(IEmailSender):
    enabled = True

    async def send_invitation(self, **_kwargs) -> None:
        raise EmailDeliveryError("No se pudo enviar el correo. Intenta nuevamente en unos minutos.")


class _RecordingSender(IEmailSender):
    def __init__(self, *, enabled: bool = True):
        self._enabled = enabled
        self.sent: list[dict] = []

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def send_invitation(self, *, to_email, store_name, invite_url, invited_by, role, expires_in_days) -> None:
        self.sent.append({"to": to_email, "url": invite_url, "role": role, "days": expires_in_days})


async def test_invitation_is_emailed_with_the_link_to_accept_it(client):
    sender = _RecordingSender()
    app.dependency_overrides[dependencies.get_email_sender] = lambda: sender
    try:
        response = await client.post("/api/v1/user-invitations", json={"email": "cajero@tienda.com"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)

    assert response.status_code == 201
    assert sender.sent[0]["to"] == "cajero@tienda.com"
    assert "/invite/" in sender.sent[0]["url"]


async def test_if_the_email_cannot_be_sent_the_owner_gets_a_clear_error_and_nothing_is_left_half_created(client):
    app.dependency_overrides[dependencies.get_email_sender] = lambda: _FailingSender()
    try:
        failed = await client.post("/api/v1/user-invitations", json={"email": "cajero@tienda.com"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)

    assert failed.status_code == 502
    assert "No se pudo enviar el correo" in failed.json()["detail"]

    # No quedo una invitacion pendiente que bloquee reintentar con el mismo correo.
    listing = await client.get("/api/v1/user-invitations")
    assert [i["email"] for i in listing.json()["items"]] == []


async def test_invitation_preview_says_who_invited(client, db_session):
    from src.infrastructure.database.models import UserModel

    owner = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    owner.full_name = "Rosa Quispe"
    await db_session.commit()
    sender = _RecordingSender()
    app.dependency_overrides[dependencies.get_email_sender] = lambda: sender
    try:
        await client.post("/api/v1/user-invitations", json={"email": "ana@tienda.com"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)
    token = sender.sent[0]["url"].rsplit("/invite/", 1)[1]

    preview = await client.get(f"/api/v1/user-invitations/preview/{token}")

    assert preview.status_code == 200, preview.text
    assert preview.json()["invited_by_name"] == "Rosa Quispe"
    assert preview.json()["role"] == "cashier"


async def test_the_email_says_the_role_and_when_the_invitation_expires(client):
    sender = _RecordingSender()
    app.dependency_overrides[dependencies.get_email_sender] = lambda: sender
    try:
        await client.post("/api/v1/user-invitations", json={"email": "socia@tienda.com", "role": "owner"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)

    assert sender.sent[0]["role"] == "owner"
    assert sender.sent[0]["days"] == settings.INVITATION_EXPIRE_DAYS


async def test_without_email_the_owner_gets_the_link_to_share_it(client, monkeypatch):
    # Producción sin correo configurado: nadie recibiría la invitación si no se ve el enlace.
    monkeypatch.setattr(settings, "DEBUG", False)
    app.dependency_overrides[dependencies.get_email_sender] = lambda: _RecordingSender(enabled=False)
    try:
        response = await client.post("/api/v1/user-invitations", json={"email": "cajero@tienda.com"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)

    assert response.status_code == 201
    assert "/invite/" in (response.json()["dev_invite_url"] or "")


async def test_when_the_email_was_sent_the_link_is_not_returned(client, monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", False)
    app.dependency_overrides[dependencies.get_email_sender] = lambda: _RecordingSender()
    try:
        response = await client.post("/api/v1/user-invitations", json={"email": "cajero@tienda.com"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)

    assert response.status_code == 201
    assert response.json()["dev_invite_url"] is None


async def test_accepted_person_gets_the_same_id_in_auth_so_they_can_log_in_again(client, monkeypatch):
    # Con otro id en Auth, el siguiente login buscaba a la persona por ese id, no la
    # encontraba e intentaba crearla de nuevo con el mismo correo (500).
    from types import SimpleNamespace

    from src.presentation.api.v1 import user_invitations as invitations_api

    sender = _RecordingSender()
    app.dependency_overrides[dependencies.get_email_sender] = lambda: sender
    try:
        await client.post("/api/v1/user-invitations", json={"email": "ana@tienda.com"})
    finally:
        app.dependency_overrides.pop(dependencies.get_email_sender, None)
    token = sender.sent[0]["url"].rsplit("/invite/", 1)[1]

    created: list[dict] = []
    session = SimpleNamespace(access_token="token-ana", refresh_token="refresh-ana")
    fake = SimpleNamespace(
        auth=SimpleNamespace(
            admin=SimpleNamespace(create_user=lambda attributes: created.append(attributes)),
            sign_in_with_password=lambda _credentials: SimpleNamespace(session=session),
        )
    )
    monkeypatch.setattr(invitations_api, "get_supabase_admin_client", lambda: fake)
    monkeypatch.setattr(invitations_api, "get_supabase_client", lambda: fake)
    monkeypatch.setattr(settings, "DEBUG", False)

    response = await client.post(
        "/api/v1/user-invitations/accept", json={"token": token, "full_name": "Ana Cajera", "password": "Cajera789!"}
    )

    assert response.status_code == 200, response.text
    assert created[0]["id"] == response.json()["user"]["id"]
    assert created[0]["email"] == "ana@tienda.com"
