from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from src.application.exceptions import UnauthorizedError
from src.domain.entities.user import User
from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_repository import IUserRepository


@dataclass
class EnsureLocalUserInput:
    user_id: UUID
    email: str
    store_id: UUID
    full_name: str | None = None
    role: str = "cashier"
    touch_login: bool = False
    password_hash: str | None = None


class EnsureLocalUserUseCase:
    def __init__(self, user_repo: IUserRepository, store_repo: IStoreRepository | None = None):
        self._user_repo = user_repo
        self._store_repo = store_repo

    async def execute(self, input: EnsureLocalUserInput) -> User:
        if self._store_repo is not None:
            store = await self._store_repo.get_by_id(input.store_id)
            if store is None:
                raise UnauthorizedError("Tienda no encontrada para el usuario")

        user = await self._user_repo.get_by_id(input.user_id)
        now = datetime.now(timezone.utc)
        if user is None:
            user = User(
                id=input.user_id,
                email=input.email,
                store_id=input.store_id,
                full_name=input.full_name,
                role=input.role,
                is_active=True,
                last_login_at=now if input.touch_login else None,
                password_hash=input.password_hash,
            )
        else:
            user.email = input.email
            user.store_id = user.store_id or input.store_id
            user.full_name = input.full_name or user.full_name
            if input.touch_login:
                user.last_login_at = now
            if input.password_hash is not None:
                user.password_hash = input.password_hash
        return await self._user_repo.save(user)
