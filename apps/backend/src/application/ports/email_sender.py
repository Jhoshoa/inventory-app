from abc import ABC, abstractmethod


class IEmailSender(ABC):
    @property
    @abstractmethod
    def enabled(self) -> bool:
        """False cuando el correo no sale de verdad (sin SMTP configurado)."""

    @abstractmethod
    async def send_invitation(
        self,
        *,
        to_email: str,
        store_name: str,
        invite_url: str,
        invited_by: str,
        role: str,
        expires_in_days: int,
    ) -> None: ...
