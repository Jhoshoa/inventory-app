import logging

from src.application.ports.email_sender import IEmailSender

logger = logging.getLogger(__name__)


class NoopEmailSender(IEmailSender):
    """Con EMAIL_ENABLED=false: no envía nada y deja la invitación en el log. La API
    devuelve el enlace para que el dueño lo comparta (ver `enabled`)."""

    @property
    def enabled(self) -> bool:
        return False

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
        logger.info(
            "Correo desactivado (EMAIL_ENABLED=false): invitacion para %s a '%s' como %s (invito %s): %s",
            to_email,
            store_name,
            role,
            invited_by,
            invite_url,
        )
