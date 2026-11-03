from src.application.exceptions import EmailDeliveryError
from src.application.ports.email_sender import IEmailSender
from src.main import app
from src.presentation import dependencies


class _FailingSender(IEmailSender):
    async def send_invitation(self, *, to_email, store_name, invite_url, invited_by) -> None:
        raise EmailDeliveryError("No se pudo enviar el correo. Intenta nuevamente en unos minutos.")


class _RecordingSender(IEmailSender):
    def __init__(self):
        self.sent: list[dict] = []

    async def send_invitation(self, *, to_email, store_name, invite_url, invited_by) -> None:
        self.sent.append({"to": to_email, "url": invite_url})


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
