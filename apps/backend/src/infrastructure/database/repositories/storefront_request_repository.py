from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.storefront_request import StorefrontRequest
from src.domain.repositories.storefront_request_repository import (
    IStorefrontRequestRepository,
)
from src.infrastructure.database.models.storefront_request_model import (
    StorefrontRequestModel,
)


class StorefrontRequestRepository(IStorefrontRequestRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, request: StorefrontRequest) -> StorefrontRequest:
        model = StorefrontRequestModel(
            id=request.id,
            store_id=request.store_id,
            product_id=request.product_id,
            product_name=request.product_name,
            customer_name=request.customer_name,
            customer_phone=request.customer_phone,
            note=request.note,
            status=request.status,
            created_at=request.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return request

    async def get_by_id(self, store_id: UUID, request_id: UUID) -> StorefrontRequest | None:
        result = await self._session.execute(
            select(StorefrontRequestModel).where(
                StorefrontRequestModel.store_id == store_id,
                StorefrontRequestModel.id == request_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_store(
        self, store_id: UUID, *, limit: int = 50, offset: int = 0
    ) -> tuple[list[StorefrontRequest], int]:
        total_result = await self._session.execute(
            select(func.count())
            .select_from(StorefrontRequestModel)
            .where(StorefrontRequestModel.store_id == store_id)
        )
        total = int(total_result.scalar_one())

        result = await self._session.execute(
            select(StorefrontRequestModel)
            .where(StorefrontRequestModel.store_id == store_id)
            .order_by(StorefrontRequestModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = [self._to_entity(model) for model in result.scalars().all()]
        return items, total

    async def count_pending(self, store_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(StorefrontRequestModel)
            .where(
                StorefrontRequestModel.store_id == store_id,
                StorefrontRequestModel.status == "pending",
            )
        )
        return int(result.scalar_one())

    async def update_status(self, store_id: UUID, request_id: UUID, status: str) -> StorefrontRequest | None:
        result = await self._session.execute(
            select(StorefrontRequestModel).where(
                StorefrontRequestModel.store_id == store_id,
                StorefrontRequestModel.id == request_id,
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        model.status = status
        await self._session.flush()
        return self._to_entity(model)

    def _to_entity(self, model: StorefrontRequestModel) -> StorefrontRequest:
        return StorefrontRequest(
            id=model.id,
            store_id=model.store_id,
            product_id=model.product_id,
            product_name=model.product_name,
            customer_name=model.customer_name,
            customer_phone=model.customer_phone,
            note=model.note,
            status=model.status,
            created_at=model.created_at,
        )
