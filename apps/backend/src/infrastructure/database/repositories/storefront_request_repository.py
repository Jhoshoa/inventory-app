from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.storefront_request import (
    StorefrontRequest,
    StorefrontRequestItem,
)
from src.domain.repositories.storefront_request_repository import (
    IStorefrontRequestRepository,
)
from src.infrastructure.database.models.storefront_request_model import (
    StorefrontRequestItemModel,
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
            payment_confirmed=request.payment_confirmed,
            created_at=request.created_at,
            total=request.total,
            delivery_method=request.delivery_method,
        )
        self._session.add(model)
        await self._session.flush()
        for position, item in enumerate(request.items):
            self._session.add(
                StorefrontRequestItemModel(
                    request_id=request.id,
                    position=position,
                    product_id=item.product_id,
                    product_name=item.product_name,
                    unit=item.unit,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                )
            )
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
        return (await self._with_items([model]))[0] if model else None

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
        return await self._with_items(list(result.scalars().all())), total

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
        return (await self._with_items([model]))[0]

    async def update_payment_confirmed(
        self, store_id: UUID, request_id: UUID, payment_confirmed: bool
    ) -> StorefrontRequest | None:
        result = await self._session.execute(
            select(StorefrontRequestModel).where(
                StorefrontRequestModel.store_id == store_id,
                StorefrontRequestModel.id == request_id,
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        model.payment_confirmed = payment_confirmed
        await self._session.flush()
        return (await self._with_items([model]))[0]

    async def _with_items(self, models: list[StorefrontRequestModel]) -> list[StorefrontRequest]:
        """Entidades con sus lineas, cargadas en una sola consulta para toda la pagina."""
        if not models:
            return []
        result = await self._session.execute(
            select(StorefrontRequestItemModel)
            .where(StorefrontRequestItemModel.request_id.in_([m.id for m in models]))
            .order_by(StorefrontRequestItemModel.position.asc())
        )
        items_by_request: dict[UUID, list[StorefrontRequestItem]] = {}
        for item in result.scalars().all():
            items_by_request.setdefault(item.request_id, []).append(
                StorefrontRequestItem(
                    product_id=item.product_id,
                    product_name=item.product_name,
                    unit=item.unit,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                )
            )
        return [self._to_entity(m, items_by_request.get(m.id, [])) for m in models]

    def _to_entity(
        self, model: StorefrontRequestModel, items: list[StorefrontRequestItem] | None = None
    ) -> StorefrontRequest:
        return StorefrontRequest(
            id=model.id,
            store_id=model.store_id,
            product_id=model.product_id,
            product_name=model.product_name,
            customer_name=model.customer_name,
            customer_phone=model.customer_phone,
            note=model.note,
            status=model.status,
            payment_confirmed=model.payment_confirmed,
            created_at=model.created_at,
            items=items or [],
            total=model.total,
            delivery_method=model.delivery_method,
        )
