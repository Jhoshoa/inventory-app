import asyncio
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from typing import Literal

from src.application.exceptions import EmailDeliveryError
from src.application.ports.email_sender import IEmailSender
from src.infrastructure.services.email.templates import BRAND_NAME, EmailContent, invitation_email

logger = logging.getLogger(__name__)

SmtpSecurity = Literal["starttls", "ssl", "none"]


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    username: str
    password: str
    security: SmtpSecurity
    from_email: str
    from_name: str
    timeout_seconds: float
    logo_url: str
    site_url: str


class SmtpEmailSender(IEmailSender):
    """Envía los correos por SMTP: el mismo código con Brevo (smtp-relay.brevo.com:587),
    cualquier otro proveedor o Mailpit en el stack local; solo cambian las variables."""

    def __init__(self, config: SmtpConfig):
        self._config = config

    @property
    def enabled(self) -> bool:
        return True

    async def send_invitation(
        self,
        *,
        to_email: str,
        store_name: str,
        invite_url: str,
        invited_by: str,
        role: str,
        expires_in_days: int,
    ) -> None:
        content = invitation_email(
            store_name=store_name,
            invited_by=invited_by,
            role=role,
            invite_url=invite_url,
            expires_in_days=expires_in_days,
            logo_url=self._config.logo_url,
            site_url=self._config.site_url,
            brand_name=self._config.from_name or BRAND_NAME,
        )
        await self.send(to_email=to_email, content=content)

    async def send(self, *, to_email: str, content: EmailContent) -> None:
        message = self._build(to_email, content)
        try:
            # smtplib bloquea: se corre en un hilo para no frenar al resto de la API.
            await asyncio.to_thread(self._deliver, message)
        except (smtplib.SMTPException, OSError) as exc:
            # El motivo (usuario o clave rechazados, remitente sin verificar, sin conexión)
            # queda en el log; nunca la clave.
            logger.error(
                "SMTP: no se pudo enviar a %s por %s:%s (%s: %s)",
                to_email,
                self._config.host,
                self._config.port,
                type(exc).__name__,
                str(exc)[:200],
            )
            raise EmailDeliveryError("No se pudo enviar el correo. Intenta nuevamente en unos minutos.") from exc

    def _build(self, to_email: str, content: EmailContent) -> EmailMessage:
        config = self._config
        message = EmailMessage()
        message["Subject"] = content.subject
        message["From"] = formataddr((config.from_name, config.from_email))
        message["To"] = to_email
        message["Date"] = formatdate(localtime=False)
        domain = config.from_email.rpartition("@")[2] or None
        message["Message-ID"] = make_msgid(domain=domain)
        message.set_content(content.text)
        message.add_alternative(content.html, subtype="html")
        return message

    def _deliver(self, message: EmailMessage) -> None:
        config = self._config
        context = ssl.create_default_context()
        if config.security == "ssl":
            server: smtplib.SMTP = smtplib.SMTP_SSL(config.host, config.port, timeout=config.timeout_seconds, context=context)
        else:
            server = smtplib.SMTP(config.host, config.port, timeout=config.timeout_seconds)
        with server:
            if config.security == "starttls":
                server.starttls(context=context)
            if config.username:
                server.login(config.username, config.password)
            server.send_message(message)
