from dataclasses import dataclass
from datetime import UTC, datetime

from src.application.exceptions import NotFoundError
from src.application.use_cases.user_invitations.create_user_invitation import hash_token
from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository


@dataclass
class PreviewUserInvitationInput:
    token: str


@dataclass
class PreviewUserInvitationResult:
    email: str
    store_name: str
    role: str
    status: str
    expires_at: datetime


class PreviewUserInvitationUseCase:
    def __init__(self, invitation_repo: IUserInvitationRepository, store_repo: IStoreRepository):
        self._invitation_repo = invitation_repo
        self._store_repo = store_repo

    async def execute(self, input: PreviewUserInvitationInput) -> PreviewUserInvitationResult:
        invitation = await self._invitation_repo.get_by_token_hash(hash_token(input.token))
        if invitation is None:
            raise NotFoundError("Invitacion no valida")

        status = invitation.status
        if status == "pending" and invitation.expires_at <= datetime.now(UTC):
            status = "expired"

        store = await self._store_repo.get_by_id(invitation.store_id)
        return PreviewUserInvitationResult(
            email=invitation.email,
            store_name=store.name if store else "la tienda",
            role=invitation.role,
            status=status,
            expires_at=invitation.expires_at,
        )
