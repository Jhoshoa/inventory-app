from dataclasses import dataclass
from datetime import UTC, datetime

from src.application.exceptions import NotFoundError
from src.application.use_cases.user_invitations.create_user_invitation import hash_token
from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository
from src.domain.repositories.user_repository import IUserRepository


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
    # "Rosa Quispe te invito a..." en la pantalla de la invitacion.
    invited_by_name: str | None = None


class PreviewUserInvitationUseCase:
    def __init__(
        self,
        invitation_repo: IUserInvitationRepository,
        store_repo: IStoreRepository,
        user_repo: IUserRepository | None = None,
    ):
        self._invitation_repo = invitation_repo
        self._store_repo = store_repo
        self._user_repo = user_repo

    async def execute(self, input: PreviewUserInvitationInput) -> PreviewUserInvitationResult:
        invitation = await self._invitation_repo.get_by_token_hash(hash_token(input.token))
        if invitation is None:
            raise NotFoundError("Invitacion no valida")

        status = invitation.status
        # Sin zona (SQLite en pruebas) se toma como UTC, igual que se guarda.
        expires_at = invitation.expires_at if invitation.expires_at.tzinfo else invitation.expires_at.replace(tzinfo=UTC)
        if status == "pending" and expires_at <= datetime.now(UTC):
            status = "expired"

        store = await self._store_repo.get_by_id(invitation.store_id)
        inviter = (
            await self._user_repo.get_by_id(invitation.invited_by_user_id)
            if self._user_repo is not None and invitation.invited_by_user_id
            else None
        )
        inviter_name = (inviter.full_name or inviter.email.split("@")[0]) if inviter else None
        return PreviewUserInvitationResult(
            email=invitation.email,
            store_name=store.name if store else "la tienda",
            role=invitation.role,
            status=status,
            expires_at=invitation.expires_at,
            invited_by_name=inviter_name,
        )
