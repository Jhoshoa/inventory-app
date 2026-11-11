from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.store_location import ProductLocation, ProductLocationKind, StoreLocation
from src.domain.repositories.store_location_repository import IStoreLocationRepository
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.models.store_location_model import (
    ProductLocationModel,
    StoreLocationModel,
)


class StoreLocationRepository(IStoreLocationRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_store(self, store_id: UUID) -> list[StoreLocation]:
        counts = (
            select(ProductLocationModel.location_id, func.count().label("product_count"))
            .join(ProductModel, ProductModel.id == ProductLocationModel.product_id)
            .where(ProductLocationModel.store_id == store_id, ProductModel.deleted_at.is_(None))
            .group_by(ProductLocationModel.location_id)
            .subquery()
        )
        result = await self._session.execute(
            select(StoreLocationModel, func.coalesce(counts.c.product_count, 0))
            .outerjoin(counts, counts.c.location_id == StoreLocationModel.id)
            .where(StoreLocationModel.store_id == store_id)
        )
        locations = [self._to_entity(model, product_count=int(count)) for model, count in result.all()]
        # Agrupadas por zona y mueble, sin importar mayusculas.
        return sorted(locations, key=lambda location: location.key())

    async def get_by_id(self, store_id: UUID, location_id: UUID) -> StoreLocation | None:
        model = await self._session.get(StoreLocationModel, location_id)
        if model is None or model.store_id != store_id:
            return None
        return self._to_entity(model)

    async def get_by_ids(self, store_id: UUID, location_ids: list[UUID]) -> list[StoreLocation]:
        if not location_ids:
            return []
        result = await self._session.execute(
            select(StoreLocationModel).where(
                StoreLocationModel.store_id == store_id,
                StoreLocationModel.id.in_(location_ids),
            )
        )
        return [self._to_entity(model) for model in result.scalars().all()]

    async def save(self, location: StoreLocation) -> StoreLocation:
        model = await self._session.get(StoreLocationModel, location.id)
        renamed = False
        if model is None:
            model = StoreLocationModel(id=location.id, store_id=location.store_id)
            self._session.add(model)
        else:
            renamed = (model.zone, model.shelf, model.level) != (location.zone, location.shelf, location.level)
        model.zone = location.zone
        model.shelf = location.shelf
        model.level = location.level
        model.updated_at = datetime.now(UTC)
        await self._session.flush()
        if renamed:
            # La ubicacion viaja con el producto al POS sin conexion: que el
            # proximo sync vuelva a bajar los productos que estan ahi.
            await self._touch_products(location.store_id, location_id=location.id)
        return self._to_entity(model)

    async def delete(self, store_id: UUID, location_id: UUID) -> None:
        await self._touch_products(store_id, location_id=location_id)
        await self._session.execute(
            delete(ProductLocationModel).where(
                ProductLocationModel.store_id == store_id,
                ProductLocationModel.location_id == location_id,
            )
        )
        await self._session.execute(
            delete(StoreLocationModel).where(
                StoreLocationModel.store_id == store_id,
                StoreLocationModel.id == location_id,
            )
        )
        await self._session.flush()

    async def for_products(self, store_id: UUID, product_ids: list[UUID]) -> dict[UUID, list[ProductLocation]]:
        if not product_ids:
            return {}
        result = await self._session.execute(
            select(ProductLocationModel, StoreLocationModel)
            .join(StoreLocationModel, StoreLocationModel.id == ProductLocationModel.location_id)
            .where(
                ProductLocationModel.store_id == store_id,
                ProductLocationModel.product_id.in_(list(set(product_ids))),
            )
            .order_by(ProductLocationModel.product_id, ProductLocationModel.position)
        )
        by_product: dict[UUID, list[ProductLocation]] = {}
        for link, location in result.all():
            by_product.setdefault(link.product_id, []).append(
                ProductLocation(location=self._to_entity(location), kind=ProductLocationKind(link.kind))
            )
        return by_product

    async def set_for_product(
        self, store_id: UUID, product_id: UUID, items: list[tuple[UUID, ProductLocationKind]]
    ) -> None:
        await self._session.execute(
            delete(ProductLocationModel).where(
                ProductLocationModel.store_id == store_id,
                ProductLocationModel.product_id == product_id,
            )
        )
        for position, (location_id, kind) in enumerate(items):
            self._session.add(
                ProductLocationModel(
                    product_id=product_id,
                    location_id=location_id,
                    store_id=store_id,
                    kind=kind.value,
                    position=position,
                )
            )
        await self._session.execute(
            update(ProductModel)
            .where(ProductModel.store_id == store_id, ProductModel.id == product_id)
            .values(updated_at=datetime.now(UTC))
        )
        await self._session.flush()

    async def _touch_products(self, store_id: UUID, *, location_id: UUID) -> None:
        linked = select(ProductLocationModel.product_id).where(
            ProductLocationModel.store_id == store_id,
            ProductLocationModel.location_id == location_id,
        )
        await self._session.execute(
            update(ProductModel)
            .where(ProductModel.store_id == store_id, ProductModel.id.in_(linked))
            .values(updated_at=datetime.now(UTC))
            .execution_options(synchronize_session=False)
        )

    @staticmethod
    def _to_entity(model: StoreLocationModel, *, product_count: int = 0) -> StoreLocation:
        return StoreLocation(
            id=model.id,
            store_id=model.store_id,
            zone=model.zone,
            shelf=model.shelf,
            level=model.level,
            product_count=product_count,
        )
