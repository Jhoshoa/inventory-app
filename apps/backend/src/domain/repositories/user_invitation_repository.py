from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.user_invitation import UserInvitation


class IUserInvitationRepository(ABC):
    @abstractmethod
    async def save(self, invitation: UserInvitation) -> UserInvitation: ...

    @abstractmethod
    async def get_by_id(self, invitation_id: UUID) -> UserInvitation | None: ...

    @abstractmethod
    async def get_by_store(self, store_id: UUID, invitation_id: UUID) -> UserInvitation | None: ...

    @abstractmethod
    async def get_by_token_hash(self, token_hash: str) -> UserInvitation | None: ...

    @abstractmethod
    async def get_pending_by_store_and_email(self, store_id: UUID, email: str) -> UserInvitation | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID, limit: int = 50, offset: int = 0) -> tuple[list[UserInvitation], int]: ...
