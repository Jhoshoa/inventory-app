from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.user_invitation import UserInvitation
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository


@dataclass
class ListUserInvitationsInput:
    store_id: UUID
    limit: int = 50
    offset: int = 0


class ListUserInvitationsUseCase:
    def __init__(self, repo: IUserInvitationRepository):
        self._repo = repo

    async def execute(self, input: ListUserInvitationsInput) -> tuple[list[UserInvitation], int]:
        return await self._repo.list_by_store(input.store_id, input.limit, input.offset)
