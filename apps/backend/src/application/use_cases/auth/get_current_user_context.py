from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import UnauthorizedError
from src.domain.entities.user import User
from src.domain.repositories.user_repository import IUserRepository


@dataclass
class CurrentUserContext:
    id: UUID
    email: str
    store_id: UUID
    full_name: str | None
    role: str
    is_active: bool


class GetCurrentUserContextUseCase:
    def __init__(self, user_repo: IUserRepository):
        self._user_repo = user_repo

    async def execute(self, raw_user: dict) -> CurrentUserContext:
        user_id = UUID(str(raw_user["id"]))
        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Usuario local no encontrado")
        if user.store_id is None:
            raise UnauthorizedError("Usuario sin tienda asignada")
        if not user.is_active:
            raise UnauthorizedError("Usuario inactivo")
        return self._to_context(user)

    def _to_context(self, user: User) -> CurrentUserContext:
        return CurrentUserContext(
            id=user.id,
            email=user.email,
            store_id=user.store_id,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
        )
