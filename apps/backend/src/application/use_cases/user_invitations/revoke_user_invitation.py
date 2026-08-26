from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.domain.entities.user_invitation import UserInvitation
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository


@dataclass
class RevokeUserInvitationInput:
    store_id: UUID
    invitation_id: UUID


class RevokeUserInvitationUseCase:
    def __init__(self, repo: IUserInvitationRepository):
        self._repo = repo

    async def execute(self, input: RevokeUserInvitationInput) -> UserInvitation:
        invitation = await self._repo.get_by_store(input.store_id, input.invitation_id)
        if invitation is None:
            raise NotFoundError("Invitacion no encontrada")
        if invitation.status == "revoked":
            return invitation
        if invitation.status != "pending":
            raise ConflictError("Solo se puede revocar una invitacion pendiente")
        invitation.status = "revoked"
        invitation.revoked_at = datetime.now(UTC)
        return await self._repo.save(invitation)
