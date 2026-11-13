import logging
import smtplib
from email.message import EmailMessage

import pytest

from src.application.exceptions import EmailDeliveryError
from src.config.settings import settings
from src.infrastructure.services.email import smtp_email_sender as module
from src.infrastructure.services.email.noop_email_sender import NoopEmailSender
from src.infrastructure.services.email.smtp_email_sender import SmtpConfig, SmtpEmailSender
from src.presentation import dependencies

PASSWORD = "xsmtpsib-clave-secreta"


class FakeServer:
    """Hace de servidor SMTP: anota lo que la API le pide."""

    instances: list["FakeServer"] = []
    fail_with: Exception | None = None

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port, self.timeout = host, port, timeout
        self.ssl = context is not None
        self.calls: list[str] = []
        self.messages: list[EmailMessage] = []
        FakeServer.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.calls.append("quit")

    def starttls(self, context=None):
        self.calls.append("starttls")

    def login(self, username, password):
        self.calls.append(f"login:{username}:{password}")

    def send_message(self, message):
        if FakeServer.fail_with:
            raise FakeServer.fail_with
        self.calls.append("send")
        self.messages.append(message)


@pytest.fixture(autouse=True)
def fake_smtp(monkeypatch):
    FakeServer.instances = []
    FakeServer.fail_with = None
    monkeypatch.setattr(module.smtplib, "SMTP", FakeServer)
    monkeypatch.setattr(module.smtplib, "SMTP_SSL", FakeServer)


def make_sender(**overrides) -> SmtpEmailSender:
    config = {
        "host": "smtp-relay.brevo.com",
        "port": 587,
        "username": "login@smtp-brevo.com",
        "password": PASSWORD,
        "security": "starttls",
        "from_email": "noreply@tutiendamiga.digital",
        "from_name": "Tu Tiendamiga",
        "timeout_seconds": 10,
        "logo_url": "https://tutiendamiga.digital/email/logo.png",
        "site_url": "https://tutiendamiga.digital",
        **overrides,
    }
    return SmtpEmailSender(SmtpConfig(**config))


def invitation(**overrides):
    return {
        "to_email": "ana@correo.com",
        "store_name": "Ferretería López",
        "invite_url": "https://tutiendamiga.digital/invite/tok_abc123",
        "invited_by": "Rosa Quispe",
        "role": "cashier",
        "expires_in_days": 7,
        **overrides,
    }


def parts(message: EmailMessage) -> tuple[str, str]:
    text = message.get_body(preferencelist=("plain",)).get_content()
    html = message.get_body(preferencelist=("html",)).get_content()
    return text, html


async def test_sends_through_starttls_with_login_like_brevo_on_587():
    await make_sender().send_invitation(**invitation())

    (server,) = FakeServer.instances
    assert (server.host, server.port, server.ssl) == ("smtp-relay.brevo.com", 587, False)
    assert server.calls == ["starttls", f"login:login@smtp-brevo.com:{PASSWORD}", "send", "quit"]
    (message,) = server.messages
    assert message["From"] == "Tu Tiendamiga <noreply@tutiendamiga.digital>"
    assert message["To"] == "ana@correo.com"
    assert message["Subject"] == "Rosa Quispe te invitó a Ferretería López"
    assert message["Message-ID"].endswith("@tutiendamiga.digital>")
    assert message.get_content_type() == "multipart/alternative"


async def test_ssl_on_465_and_plain_mailpit_without_login():
    await make_sender(port=465, security="ssl").send_invitation(**invitation())
    await make_sender(host="mailpit", port=1025, security="none", username="", password="").send_invitation(**invitation())

    ssl_server, mailpit = FakeServer.instances
    assert ssl_server.ssl is True
    assert "starttls" not in ssl_server.calls
    assert mailpit.calls == ["send", "quit"]


async def test_the_email_has_the_link_the_role_the_expiry_and_the_logo_in_html_and_text():
    await make_sender().send_invitation(**invitation(role="owner", expires_in_days=1))

    text, html = parts(FakeServer.instances[0].messages[0])
    for body in (text, html):
        assert "https://tutiendamiga.digital/invite/tok_abc123" in body
        assert "Dueño" in body
        assert "vence en 1 día" in body
    assert '<img src="https://tutiendamiga.digital/email/logo.png"' in html
    assert "Aceptar invitación" in html


async def test_names_written_by_users_cannot_inject_html_or_headers():
    await make_sender().send_invitation(
        **invitation(store_name='Tienda <script>alert(1)</script>', invited_by="Eva\r\nBcc: todos@spam.com")
    )

    message = FakeServer.instances[0].messages[0]
    _, html = parts(message)
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "\n" not in message["Subject"]
    assert message["Bcc"] is None


async def test_a_refused_delivery_is_a_clear_error_and_the_password_never_reaches_the_log(caplog):
    FakeServer.fail_with = smtplib.SMTPAuthenticationError(535, b"5.7.8 Authentication failed")

    with caplog.at_level(logging.ERROR), pytest.raises(EmailDeliveryError, match="No se pudo enviar el correo"):
        await make_sender().send_invitation(**invitation())

    assert "SMTPAuthenticationError" in caplog.text
    assert PASSWORD not in caplog.text


async def test_no_connection_is_also_a_delivery_error():
    FakeServer.fail_with = TimeoutError("timed out")

    with pytest.raises(EmailDeliveryError):
        await make_sender().send_invitation(**invitation())


def test_without_email_enabled_nothing_is_sent_and_the_sender_says_so(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_ENABLED", False)
    sender = dependencies.get_email_sender()
    assert isinstance(sender, NoopEmailSender)
    assert sender.enabled is False


def test_with_email_enabled_the_api_uses_smtp_with_the_settings(monkeypatch):
    for name, value in {
        "EMAIL_ENABLED": True,
        "SMTP_HOST": " smtp-relay.brevo.com ",
        "SMTP_PORT": 587,
        "SMTP_USERNAME": "login@smtp-brevo.com",
        "SMTP_PASSWORD": PASSWORD,
        "SMTP_SECURITY": "starttls",
        "SMTP_FROM_EMAIL": "noreply@tutiendamiga.digital",
        "SMTP_FROM_NAME": "Tu Tiendamiga",
        "FRONTEND_URL": "https://tutiendamiga.digital",
        "EMAIL_LOGO_URL": "",
    }.items():
        monkeypatch.setattr(settings, name, value)

    sender = dependencies.get_email_sender()

    assert isinstance(sender, SmtpEmailSender)
    assert sender.enabled is True
    assert sender._config.host == "smtp-relay.brevo.com"
    assert sender._config.logo_url == "https://tutiendamiga.digital/email/logo.png"
