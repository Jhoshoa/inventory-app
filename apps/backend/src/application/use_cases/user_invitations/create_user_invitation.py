import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from src.application.exceptions import ConflictError
from src.application.ports.email_sender import IEmailSender
from src.config.settings import settings
from src.domain.entities.user_invitation import UserInvitation
from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository
from src.domain.repositories.user_repository import IUserRepository


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


@dataclass
class CreateUserInvitationInput:
    store_id: UUID
    invited_by_user_id: UUID
    invited_by_name: str
    email: str
    role: str


@dataclass
class CreateUserInvitationResult:
    invitation: UserInvitation
    raw_token: str


class CreateUserInvitationUseCase:
    def __init__(
        self,
        invitation_repo: IUserInvitationRepository,
        user_repo: IUserRepository,
        store_repo: IStoreRepository,
        email_sender: IEmailSender,
    ):
        self._invitation_repo = invitation_repo
        self._user_repo = user_repo
        self._store_repo = store_repo
        self._email_sender = email_sender

    async def execute(self, input: CreateUserInvitationInput) -> CreateUserInvitationResult:
        existing_user = await self._user_repo.get_by_email(input.email)
        if existing_user is not None:
            raise ConflictError("Este email ya pertenece a un usuario existente")

        existing_invitation = await self._invitation_repo.get_pending_by_store_and_email(
            input.store_id, input.email
        )
        if existing_invitation is not None:
            raise ConflictError("Ya existe una invitacion pendiente para este email")

        raw_token = secrets.token_urlsafe(32)
        now = datetime.now(UTC)
        invitation = UserInvitation(
            id=uuid4(),
            store_id=input.store_id,
            email=input.email,
            role=input.role,
            token_hash=hash_token(raw_token),
            status="pending",
            expires_at=now + timedelta(days=settings.INVITATION_EXPIRE_DAYS),
            invited_by_user_id=input.invited_by_user_id,
            last_sent_at=now,
            send_count=1,
        )
        saved = await self._invitation_repo.save(invitation)

        store = await self._store_repo.get_by_id(input.store_id)
        invite_url = f"{settings.FRONTEND_URL}/invite/{raw_token}"
        await self._email_sender.send_invitation(
            to_email=input.email,
            store_name=store.name if store else "tu tienda",
            invite_url=invite_url,
            invited_by=input.invited_by_name,
        )
        return CreateUserInvitationResult(invitation=saved, raw_token=raw_token)
