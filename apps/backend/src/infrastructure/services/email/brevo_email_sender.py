import logging
import re
from html import escape

import httpx

from src.application.exceptions import EmailDeliveryError
from src.application.ports.email_sender import IEmailSender

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"
_CONTROL_CHARS = re.compile(r"[\r\n\t\x00-\x1f]+")


def _one_line(value: str) -> str:
    return _CONTROL_CHARS.sub(" ", value).strip()


class BrevoEmailSender(IEmailSender):
    """Envia correos transaccionales por la API de Brevo (https://developers.brevo.com)."""

    def __init__(
        self,
        *,
        api_key: str,
        from_address: str,
        from_name: str,
        http_client: httpx.AsyncClient | None = None,
        timeout_seconds: float = 10.0,
    ):
        self._api_key = api_key
        self._from_address = from_address
        self._from_name = from_name
        self._http_client = http_client
        self._timeout_seconds = timeout_seconds

    async def send_invitation(self, *, to_email: str, store_name: str, invite_url: str, invited_by: str) -> None:
        store = _one_line(store_name)
        inviter = _one_line(invited_by)
        payload = {
            "sender": {"email": self._from_address, "name": self._from_name},
            "to": [{"email": to_email}],
            "subject": f"{inviter} te invitó a {store}",
            "htmlContent": self._html(store, inviter, invite_url),
            "textContent": (
                f"{inviter} te invitó a unirte a {store} como cajero.\n\n"
                f"Crea tu cuenta aquí: {invite_url}\n\n"
                "Si no esperabas esta invitación, puedes ignorar este correo."
            ),
        }
        await self._post(payload, to_email)

    @staticmethod
    def _html(store: str, inviter: str, invite_url: str) -> str:
        # Nombre de tienda y de quien invita los escribe un usuario: se escapan.
        return (
            '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2937">'
            f"<p><strong>{escape(inviter)}</strong> te invitó a unirte a <strong>{escape(store)}</strong> como cajero.</p>"
            f'<p><a href="{escape(invite_url, quote=True)}" style="display:inline-block;background:#1e40af;color:#fff;'
            'padding:12px 20px;border-radius:6px;text-decoration:none">Crear mi cuenta</a></p>'
            '<p style="font-size:13px;color:#6b7280">Si el botón no funciona, copia este enlace en tu navegador:<br>'
            f"{escape(invite_url)}</p>"
            '<p style="font-size:13px;color:#6b7280">Si no esperabas esta invitación, puedes ignorar este correo.</p>'
            "</div>"
        )

    async def _post(self, payload: dict, to_email: str) -> None:
        headers = {"api-key": self._api_key, "accept": "application/json"}
        try:
            if self._http_client is not None:
                response = await self._http_client.post(BREVO_SEND_URL, json=payload, headers=headers)
            else:
                async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                    response = await client.post(BREVO_SEND_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("Brevo: no se pudo contactar el servicio (%s)", type(exc).__name__)
            raise EmailDeliveryError("No se pudo enviar el correo. Intenta nuevamente en unos minutos.") from exc

        if response.status_code >= 400:
            # El cuerpo de Brevo explica el motivo (remitente sin verificar, cuota...); nunca incluye la api-key.
            logger.error("Brevo rechazo el envio a %s: HTTP %s %s", to_email, response.status_code, response.text[:300])
            raise EmailDeliveryError("No se pudo enviar el correo. Revisa la configuracion de correo e intenta nuevamente.")
