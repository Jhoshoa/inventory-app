import json

import httpx
import pytest

from src.application.exceptions import EmailDeliveryError
from src.config.settings import settings
from src.infrastructure.services.email.brevo_email_sender import BREVO_SEND_URL, BrevoEmailSender
from src.infrastructure.services.email.noop_email_sender import NoopEmailSender
from src.presentation import dependencies

API_KEY = "xkeysib-clave-secreta"


def make_sender(handler) -> BrevoEmailSender:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return BrevoEmailSender(
        api_key=API_KEY,
        from_address="no-responder@ecobriefbolivia.online",
        from_name="TiendaStock",
        http_client=client,
    )


def invitation(**overrides):
    return {
        "to_email": "cajero@tienda.com",
        "store_name": "Ferreteria Lopez",
        "invite_url": "https://app.ecobriefbolivia.online/invite/tok_abc123",
        **overrides,
        "invited_by": overrides.get("invited_by", "Maria Lopez"),
    }


async def test_sends_the_invitation_through_brevo_with_the_api_key_header():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(201, json={"messageId": "<abc@smtp-relay>"})

    await make_sender(handler).send_invitation(**invitation())

    (request,) = seen
    assert str(request.url) == BREVO_SEND_URL
    assert request.headers["api-key"] == API_KEY
    body = json.loads(request.content)
    assert body["sender"] == {"email": "no-responder@ecobriefbolivia.online", "name": "TiendaStock"}
    assert body["to"] == [{"email": "cajero@tienda.com"}]
    assert body["subject"] == "Maria Lopez te invitó a Ferreteria Lopez"
    assert "https://app.ecobriefbolivia.online/invite/tok_abc123" in body["htmlContent"]
    assert "https://app.ecobriefbolivia.online/invite/tok_abc123" in body["textContent"]


async def test_user_controlled_names_cannot_inject_html_into_the_email():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(201, json={})

    await make_sender(handler).send_invitation(
        **invitation(store_name='<script>alert(1)</script>"Tienda"', invited_by="<img src=x onerror=alert(2)>")
    )

    html = json.loads(seen[0].content)["htmlContent"]
    assert "<script>" not in html
    assert "<img" not in html
    assert "&lt;script&gt;" in html


async def test_names_with_line_breaks_cannot_split_the_subject():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(201, json={})

    await make_sender(handler).send_invitation(**invitation(invited_by="Maria\r\nBcc: victima@x.com"))

    subject = json.loads(seen[0].content)["subject"]
    assert "\n" not in subject and "\r" not in subject


@pytest.mark.parametrize("status", [400, 401, 402, 500, 503])
async def test_brevo_errors_become_a_clear_error_that_never_leaks_the_api_key(status):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json={"message": "Sender not verified", "echo": request.headers["api-key"]})

    with pytest.raises(EmailDeliveryError) as exc_info:
        await make_sender(handler).send_invitation(**invitation())

    assert API_KEY not in exc_info.value.detail
    assert exc_info.value.status_code == 502


async def test_network_failures_become_a_delivery_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin red")

    with pytest.raises(EmailDeliveryError):
        await make_sender(handler).send_invitation(**invitation())


def test_without_brevo_configuration_invitations_only_go_to_the_log(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", None)

    assert isinstance(dependencies.get_email_sender(), NoopEmailSender)


def test_with_brevo_configuration_invitations_are_really_sent(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", API_KEY)
    monkeypatch.setattr(settings, "EMAIL_FROM_ADDRESS", "no-responder@ecobriefbolivia.online")

    assert isinstance(dependencies.get_email_sender(), BrevoEmailSender)


def test_an_api_key_without_a_sender_address_is_not_enough(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", API_KEY)
    monkeypatch.setattr(settings, "EMAIL_FROM_ADDRESS", "")

    assert isinstance(dependencies.get_email_sender(), NoopEmailSender)
