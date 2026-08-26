import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.application.ports.email_sender import IEmailSender
from src.application.use_cases.user_invitations.create_user_invitation import hash_token
from src.config.settings import settings
from src.domain.entities.user_invitation import UserInvitation
from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository


@dataclass
class ResendUserInvitationInput:
    store_id: UUID
    invitation_id: UUID
    invited_by_name: str


@dataclass
class ResendUserInvitationResult:
    invitation: UserInvitation
    raw_token: str


class ResendUserInvitationUseCase:
    def __init__(
        self,
        repo: IUserInvitationRepository,
        store_repo: IStoreRepository,
        email_sender: IEmailSender,
    ):
        self._repo = repo
        self._store_repo = store_repo
        self._email_sender = email_sender

    async def execute(self, input: ResendUserInvitationInput) -> ResendUserInvitationResult:
        invitation = await self._repo.get_by_store(input.store_id, input.invitation_id)
        if invitation is None:
            raise NotFoundError("Invitacion no encontrada")
        if invitation.status != "pending":
            raise ConflictError("Solo se puede reenviar una invitacion pendiente")

        raw_token = secrets.token_urlsafe(32)
        now = datetime.now(UTC)
        invitation.token_hash = hash_token(raw_token)
        invitation.expires_at = now + timedelta(days=settings.INVITATION_EXPIRE_DAYS)
        invitation.last_sent_at = now
        invitation.send_count += 1
        saved = await self._repo.save(invitation)

        store = await self._store_repo.get_by_id(input.store_id)
        invite_url = f"{settings.FRONTEND_URL}/invite/{raw_token}"
        await self._email_sender.send_invitation(
            to_email=invitation.email,
            store_name=store.name if store else "tu tienda",
            invite_url=invite_url,
            invited_by=input.invited_by_name,
        )
        return ResendUserInvitationResult(invitation=saved, raw_token=raw_token)
