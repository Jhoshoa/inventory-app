from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.user_invitation import UserInvitation
from src.domain.repositories.user_invitation_repository import IUserInvitationRepository
from src.infrastructure.database.models.user_invitation_model import UserInvitationModel


class UserInvitationRepository(IUserInvitationRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, invitation: UserInvitation) -> UserInvitation:
        model = await self._session.get(UserInvitationModel, invitation.id)
        if model is None:
            model = UserInvitationModel(id=invitation.id)
            self._session.add(model)
        model.store_id = invitation.store_id
        model.email = invitation.email
        model.role = invitation.role
        model.token_hash = invitation.token_hash
        model.status = invitation.status
        model.expires_at = invitation.expires_at
        model.invited_by_user_id = invitation.invited_by_user_id
        model.accepted_by_user_id = invitation.accepted_by_user_id
        model.accepted_at = invitation.accepted_at
        model.revoked_at = invitation.revoked_at
        model.last_sent_at = invitation.last_sent_at
        model.send_count = invitation.send_count
        model.updated_at = datetime.now(UTC)
        await self._session.flush()
        return self._to_entity(model)

    async def get_by_id(self, invitation_id: UUID) -> UserInvitation | None:
        model = await self._session.get(UserInvitationModel, invitation_id)
        return self._to_entity(model) if model else None

    async def get_by_store(self, store_id: UUID, invitation_id: UUID) -> UserInvitation | None:
        result = await self._session.execute(
            select(UserInvitationModel).where(
                UserInvitationModel.store_id == store_id,
                UserInvitationModel.id == invitation_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token_hash(self, token_hash: str) -> UserInvitation | None:
        result = await self._session.execute(
            select(UserInvitationModel).where(UserInvitationModel.token_hash == token_hash)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_pending_by_store_and_email(self, store_id: UUID, email: str) -> UserInvitation | None:
        result = await self._session.execute(
            select(UserInvitationModel).where(
                UserInvitationModel.store_id == store_id,
                UserInvitationModel.email == email,
                UserInvitationModel.status == "pending",
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_store(
        self, store_id: UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[UserInvitation], int]:
        total_result = await self._session.execute(
            select(func.count()).select_from(UserInvitationModel).where(UserInvitationModel.store_id == store_id)
        )
        total = int(total_result.scalar_one())
        result = await self._session.execute(
            select(UserInvitationModel)
            .where(UserInvitationModel.store_id == store_id)
            .order_by(UserInvitationModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(model) for model in result.scalars().all()], total

    def _to_entity(self, model: UserInvitationModel) -> UserInvitation:
        return UserInvitation(
            id=model.id,
            store_id=model.store_id,
            email=model.email,
            role=model.role,
            token_hash=model.token_hash,
            status=model.status,
            expires_at=model.expires_at,
            invited_by_user_id=model.invited_by_user_id,
            accepted_by_user_id=model.accepted_by_user_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
            accepted_at=model.accepted_at,
            revoked_at=model.revoked_at,
            last_sent_at=model.last_sent_at,
            send_count=model.send_count,
        )
