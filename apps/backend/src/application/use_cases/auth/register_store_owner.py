from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.store import Store
from src.domain.entities.user import User
from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_repository import IUserRepository


@dataclass
class RegisterStoreOwnerInput:
    user_id: UUID
    email: str
    full_name: str
    store_name: str
    store_id: UUID | None = None
    password_hash: str | None = None


@dataclass
class RegisterStoreOwnerResult:
    store: Store
    user: User


class RegisterStoreOwnerUseCase:
    def __init__(self, store_repo: IStoreRepository, user_repo: IUserRepository):
        self._store_repo = store_repo
        self._user_repo = user_repo

    async def execute(self, input: RegisterStoreOwnerInput) -> RegisterStoreOwnerResult:
        store = Store(id=input.store_id, name=input.store_name) if input.store_id else Store.create(input.store_name)
        store = await self._store_repo.save(store)
        user = await self._user_repo.save(
            User(
                id=input.user_id,
                email=input.email,
                store_id=store.id,
                full_name=input.full_name,
                role="owner",
                is_active=True,
                password_hash=input.password_hash,
            )
        )
        return RegisterStoreOwnerResult(store=store, user=user)
