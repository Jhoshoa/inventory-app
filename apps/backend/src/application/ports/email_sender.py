from abc import ABC, abstractmethod


class IEmailSender(ABC):
    @abstractmethod
    async def send_invitation(self, *, to_email: str, store_name: str, invite_url: str, invited_by: str) -> None: ...
