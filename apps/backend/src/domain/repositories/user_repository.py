from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.user import User


class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def get_by_store(self, store_id: UUID, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID, limit: int = 50, offset: int = 0) -> tuple[list[User], int]: ...

    @abstractmethod
    async def count_active_owners(self, store_id: UUID) -> int: ...

    @abstractmethod
    async def list_active_by_store(self, store_id: UUID) -> list[User]: ...

    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def get_by_email_with_password(self, email: str) -> tuple[User, str | None] | None: ...

    @abstractmethod
    async def save_with_password(self, user: User, password_hash: str) -> User: ...

    @abstractmethod
    async def set_password_hash(self, user_id: UUID, password_hash: str) -> None: ...

    @abstractmethod
    async def update_role(self, store_id: UUID, user_id: UUID, role: str) -> User | None: ...

    @abstractmethod
    async def update_status(self, store_id: UUID, user_id: UUID, is_active: bool) -> User | None: ...

    @abstractmethod
    async def touch_last_login(self, user_id: UUID) -> User | None: ...
