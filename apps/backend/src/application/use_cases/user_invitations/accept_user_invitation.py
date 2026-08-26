from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.user_invitations.create_user_invitation import hash_token
from src.domain.entities.user import User
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository
from src.domain.repositories.user_repository import IUserRepository
from src.infrastructure.auth.password import hash_password


@dataclass
class AcceptUserInvitationInput:
    token: str
    full_name: str
    password: str


class AcceptUserInvitationUseCase:
    def __init__(self, invitation_repo: IUserInvitationRepository, user_repo: IUserRepository):
        self._invitation_repo = invitation_repo
        self._user_repo = user_repo

    async def execute(self, input: AcceptUserInvitationInput) -> User:
        invitation = await self._invitation_repo.get_by_token_hash(hash_token(input.token))
        if invitation is None:
            raise NotFoundError("Invitacion no valida")

        now = datetime.now(UTC)
        if invitation.status == "accepted":
            raise ConflictError("Esta invitacion ya fue utilizada")
        if invitation.status == "revoked":
            raise ConflictError("Esta invitacion fue revocada")
        if invitation.status != "pending" or invitation.expires_at <= now:
            invitation.status = "expired"
            await self._invitation_repo.save(invitation)
            raise ConflictError("Esta invitacion ha expirado")

        existing_user = await self._user_repo.get_by_email(invitation.email)
        if existing_user is not None:
            raise ConflictError("Este email ya pertenece a un usuario existente")

        user_entity = User(
            id=uuid4(),
            email=invitation.email,
            store_id=invitation.store_id,
            full_name=input.full_name,
            role=invitation.role,
            is_active=True,
        )
        user = await self._user_repo.save_with_password(user_entity, hash_password(input.password))

        invitation.status = "accepted"
        invitation.accepted_by_user_id = user.id
        invitation.accepted_at = now
        await self._invitation_repo.save(invitation)

        return user
