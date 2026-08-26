import logging

from src.application.ports.email_sender import IEmailSender

logger = logging.getLogger(__name__)


class NoopEmailSender(IEmailSender):
    """Implementacion no-op: registra la invitacion en logs en vez de enviarla.

    Reemplazar por un proveedor real (p. ej. Resend) antes de habilitar
    invitaciones en produccion.
    """

    async def send_invitation(self, *, to_email: str, store_name: str, invite_url: str, invited_by: str) -> None:
        logger.info(
            "NoopEmailSender: invitacion para %s a la tienda '%s' (invitado por %s): %s",
            to_email,
            store_name,
            invited_by,
            invite_url,
        )
