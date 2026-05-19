from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.user import User
from src.domain.repositories.user_repository import IUserRepository


@dataclass
class ListUsersInput:
    store_id: UUID
    limit: int = 50
    offset: int = 0


class ListUsersUseCase:
    def __init__(self, repo: IUserRepository):
        self._repo = repo

    async def execute(self, input: ListUsersInput) -> tuple[list[User], int]:
        return await self._repo.list_by_store(input.store_id, input.limit, input.offset)
