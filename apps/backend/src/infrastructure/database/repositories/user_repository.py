from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.user import User
from src.domain.repositories.user_repository import IUserRepository
from src.infrastructure.database.models.user_model import UserModel


class UserRepository(IUserRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        model = await self._session.get(UserModel, user_id)
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(UserModel).where(UserModel.email == email))
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_store(self, store_id: UUID, user_id: UUID) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.store_id == store_id, UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_store(self, store_id: UUID, limit: int = 50, offset: int = 0) -> tuple[list[User], int]:
        total_result = await self._session.execute(
            select(func.count()).select_from(UserModel).where(UserModel.store_id == store_id)
        )
        total = int(total_result.scalar_one())
        result = await self._session.execute(
            select(UserModel)
            .where(UserModel.store_id == store_id)
            .order_by(UserModel.role.desc(), UserModel.email.asc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(model) for model in result.scalars().all()], total

    async def count_active_owners(self, store_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(UserModel)
            .where(UserModel.store_id == store_id, UserModel.role == "owner", UserModel.is_active.is_(True))
        )
        return int(result.scalar_one())

    async def save(self, user: User) -> User:
        model = await self._session.get(UserModel, user.id)
        if model is None:
            model = UserModel(id=user.id)
            self._session.add(model)
        model.email = user.email
        model.store_id = user.store_id
        model.full_name = user.full_name
        model.role = user.role
        model.is_active = user.is_active
        model.last_login_at = user.last_login_at
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    async def update_role(self, store_id: UUID, user_id: UUID, role: str) -> User | None:
        model = await self._get_model_by_store(store_id, user_id)
        if not model:
            return None
        model.role = role
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    async def update_status(self, store_id: UUID, user_id: UUID, is_active: bool) -> User | None:
        model = await self._get_model_by_store(store_id, user_id)
        if not model:
            return None
        model.is_active = is_active
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    async def touch_last_login(self, user_id: UUID) -> User | None:
        model = await self._session.get(UserModel, user_id)
        if not model:
            return None
        model.last_login_at = datetime.now(timezone.utc)
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    async def get_by_email_with_password(self, email: str) -> tuple[User, str | None] | None:
        result = await self._session.execute(select(UserModel).where(UserModel.email == email))
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return (self._to_entity(model), model.password_hash)

    async def save_with_password(self, user: User, password_hash: str) -> User:
        model = await self._session.get(UserModel, user.id)
        if model is None:
            model = UserModel(id=user.id)
            self._session.add(model)
        model.email = user.email
        model.store_id = user.store_id
        model.full_name = user.full_name
        model.role = user.role
        model.is_active = user.is_active
        model.last_login_at = user.last_login_at
        model.updated_at = datetime.now(timezone.utc)
        model.password_hash = password_hash
        await self._session.flush()
        return self._to_entity(model)

    async def set_password_hash(self, user_id: UUID, password_hash: str) -> None:
        model = await self._session.get(UserModel, user_id)
        if model is not None:
            model.password_hash = password_hash
            model.updated_at = datetime.now(timezone.utc)
            await self._session.flush()

    async def list_active_by_store(self, store_id: UUID) -> list[User]:
        result = await self._session.execute(
            select(UserModel).where(
                UserModel.store_id == store_id,
                UserModel.is_active.is_(True),
            )
        )
        return [self._to_entity(model) for model in result.scalars().all()]

    async def _get_model_by_store(self, store_id: UUID, user_id: UUID) -> UserModel | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.store_id == store_id, UserModel.id == user_id)
        )
        return result.scalar_one_or_none()

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            store_id=model.store_id,
            full_name=model.full_name,
            role=model.role,
            is_active=model.is_active,
            last_login_at=model.last_login_at,
            updated_at=model.updated_at,
        )
