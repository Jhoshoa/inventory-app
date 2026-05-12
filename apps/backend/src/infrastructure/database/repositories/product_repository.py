from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository
from src.infrastructure.database.models.product_model import ProductModel


class ProductRepository(IProductRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, product: Product) -> Product:
        model = await self._session.get(ProductModel, product.id)
        if model is None:
            model = ProductModel(id=product.id, store_id=product.store_id)
            self._session.add(model)
        model.name = product.name
        model.price = product.price
        model.stock = product.stock
        model.min_stock = product.min_stock
        model.category = product.category
        model.sku = product.sku
        model.unit = product.unit
        model.photo_url = product.photo_url
        model.qr_code = product.qr_code
        model.cost_price = product.cost_price
        model.is_active = product.is_active
        model.version = product.version
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return product

    def _to_entity(self, model: ProductModel) -> Product:
        return Product(
            id=model.id,
            store_id=model.store_id,
            name=model.name,
            price=model.price,
            stock=model.stock,
            min_stock=model.min_stock,
            category=model.category,
            sku=model.sku,
            unit=model.unit,
            photo_url=model.photo_url,
            qr_code=model.qr_code,
            cost_price=model.cost_price,
            is_active=model.is_active,
            version=model.version,
        )

    async def get_by_id(self, product_id: UUID) -> Product | None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id, ProductModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def list_by_store(self, store_id: UUID) -> list[Product]:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.store_id == store_id, ProductModel.deleted_at.is_(None))
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def delete(self, product_id: UUID) -> None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.deleted_at = datetime.now(timezone.utc)
            model.is_active = False
            await self._session.flush()

    async def update_stock(self, product_id: UUID, quantity: int) -> Product:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError("Producto no encontrado")
        if model.stock + quantity < 0:
            raise ValueError(f"Stock insuficiente: {model.stock} < {abs(quantity)}")
        model.stock += quantity
        model.version += 1
        model.updated_at = datetime.now(timezone.utc)
        await self._session.flush()
        return self._to_entity(model)
