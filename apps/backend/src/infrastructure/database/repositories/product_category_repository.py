from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.product_category import ProductCategory
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.infrastructure.database.models.product_category_model import (
    ProductCategoryModel,
)
from src.infrastructure.database.models.product_model import ProductModel


class ProductCategoryRepository(IProductCategoryRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, category: ProductCategory) -> ProductCategory:
        model = await self._session.get(ProductCategoryModel, category.id)
        if model is None:
            model = ProductCategoryModel(id=category.id, store_id=category.store_id)
            self._session.add(model)
        model.name = category.name
        model.sku_prefix = category.sku_prefix
        model.next_sku_number = category.next_sku_number
        model.is_active = category.is_active
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)

    async def get_by_id(self, store_id: UUID, category_id: UUID) -> ProductCategory | None:
        result = await self._session.execute(
            select(ProductCategoryModel).where(
                ProductCategoryModel.store_id == store_id,
                ProductCategoryModel.id == category_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_store(self, store_id: UUID, include_inactive: bool = False) -> list[ProductCategory]:
        filters = [ProductCategoryModel.store_id == store_id]
        if not include_inactive:
            filters.append(ProductCategoryModel.is_active.is_(True))
        result = await self._session.execute(
            select(ProductCategoryModel)
            .where(*filters)
            .order_by(ProductCategoryModel.is_active.desc(), ProductCategoryModel.name.asc())
        )
        return [self._to_entity(model) for model in result.scalars().all()]

    async def name_exists(self, store_id: UUID, name: str, exclude_category_id: UUID | None = None) -> bool:
        filters = [ProductCategoryModel.store_id == store_id, func.lower(ProductCategoryModel.name) == name.strip().lower()]
        if exclude_category_id is not None:
            filters.append(ProductCategoryModel.id != exclude_category_id)
        result = await self._session.execute(select(func.count()).select_from(ProductCategoryModel).where(*filters))
        return int(result.scalar_one()) > 0

    async def sku_prefix_exists(self, store_id: UUID, sku_prefix: str, exclude_category_id: UUID | None = None) -> bool:
        filters = [
            ProductCategoryModel.store_id == store_id,
            ProductCategoryModel.sku_prefix == sku_prefix.strip().upper(),
        ]
        if exclude_category_id is not None:
            filters.append(ProductCategoryModel.id != exclude_category_id)
        result = await self._session.execute(select(func.count()).select_from(ProductCategoryModel).where(*filters))
        return int(result.scalar_one()) > 0

    async def reserve_next_sku(self, store_id: UUID, category_id: UUID) -> str | None:
        result = await self._session.execute(
            select(ProductCategoryModel)
            .where(
                ProductCategoryModel.store_id == store_id,
                ProductCategoryModel.id == category_id,
                ProductCategoryModel.is_active.is_(True),
            )
            .with_for_update()
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None

        sku, next_sku_number = await self._next_available_sku(
            model.store_id,
            model.sku_prefix,
            model.next_sku_number,
        )
        model.next_sku_number = next_sku_number
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return sku

    async def _next_available_sku(self, store_id: UUID, sku_prefix: str, start_number: int) -> tuple[str, int]:
        next_number = max(start_number, 1)
        while True:
            sku = f"{sku_prefix}{next_number:06d}"
            result = await self._session.execute(
                select(func.count()).select_from(ProductModel).where(
                    ProductModel.store_id == store_id,
                    ProductModel.sku == sku,
                )
            )
            if int(result.scalar_one()) == 0:
                return sku, next_number + 1
            next_number += 1

    def _to_entity(self, model: ProductCategoryModel) -> ProductCategory:
        return ProductCategory(
            id=model.id,
            store_id=model.store_id,
            name=model.name,
            sku_prefix=model.sku_prefix,
            next_sku_number=model.next_sku_number,
            is_active=model.is_active,
        )
