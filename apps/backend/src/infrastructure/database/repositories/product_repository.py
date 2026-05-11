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
        model = ProductModel(
            id=product.id,
            store_id=product.store_id,
            name=product.name,
            price=product.price,
            stock=product.stock,
            min_stock=product.min_stock,
            category=product.category,
            sku=product.sku,
            unit=product.unit,
            qr_code=product.qr_code,
        )
        self._session.add(model)
        await self._session.commit()
        return product

    async def get_by_id(self, product_id: UUID) -> Product | None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id, ProductModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        return Product(
            id=model.id,
            store_id=model.store_id,
            name=model.name,
            price=model.price,
            stock=model.stock,
            min_stock=model.min_stock,
            category=model.category,
        )

    async def list_by_store(self, store_id: UUID) -> list[Product]:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.store_id == store_id, ProductModel.deleted_at.is_(None))
        )
        return [
            Product(id=m.id, store_id=m.store_id, name=m.name, price=m.price, stock=m.stock, category=m.category, min_stock=m.min_stock)
            for m in result.scalars().all()
        ]

    async def delete(self, product_id: UUID) -> None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.deleted_at = datetime.now(timezone.utc)
            await self._session.commit()

    async def update_stock(self, product_id: UUID, quantity: int) -> Product:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError("Producto no encontrado")
        model.stock += quantity
        model.version += 1
        await self._session.commit()
        return Product(
            id=model.id,
            store_id=model.store_id,
            name=model.name,
            price=model.price,
            stock=model.stock,
        )
