from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.domain.entities.user import User
from src.domain.repositories.user_repository import IUserRepository


@dataclass
class UpdateUserRoleInput:
    store_id: UUID
    actor_user_id: UUID
    user_id: UUID
    role: str


class UpdateUserRoleUseCase:
    def __init__(self, repo: IUserRepository):
        self._repo = repo

    async def execute(self, input: UpdateUserRoleInput) -> User:
        user = await self._repo.get_by_store(input.store_id, input.user_id)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        if user.role == "owner" and input.role != "owner":
            owners = await self._repo.count_active_owners(input.store_id)
            if owners <= 1:
                raise ConflictError("No se puede remover el ultimo owner activo")
        updated = await self._repo.update_role(input.store_id, input.user_id, input.role)
        if not updated:
            raise NotFoundError("Usuario no encontrado")
        return updated
