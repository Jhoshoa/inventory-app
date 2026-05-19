from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.models.stock_movement_model import StockMovementModel


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

    async def get_by_id(self, store_id: UUID, product_id: UUID) -> Product | None:
        result = await self._session.execute(
            select(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.id == product_id,
                ProductModel.deleted_at.is_(None),
            )
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

    async def search(
        self,
        store_id: UUID,
        *,
        q: str | None = None,
        category: str | None = None,
        stock: str = "all",
        limit: int = 50,
        offset: int = 0,
        sort: str = "name",
        direction: str = "asc",
    ) -> tuple[list[Product], int]:
        filters = [ProductModel.store_id == store_id, ProductModel.deleted_at.is_(None)]
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    ProductModel.name.ilike(pattern),
                    ProductModel.sku.ilike(pattern),
                    ProductModel.qr_code.ilike(pattern),
                )
            )
        if category:
            filters.append(ProductModel.category == category)
        if stock == "available":
            filters.append(ProductModel.stock > 0)
        elif stock == "low":
            filters.append(ProductModel.stock <= ProductModel.min_stock)
        elif stock == "out":
            filters.append(ProductModel.stock <= 0)

        total_result = await self._session.execute(select(func.count()).select_from(ProductModel).where(*filters))
        total = int(total_result.scalar_one())

        sort_columns = {
            "name": ProductModel.name,
            "stock": ProductModel.stock,
            "updated_at": ProductModel.updated_at,
            "price": ProductModel.price,
        }
        sort_column = sort_columns.get(sort, ProductModel.name)
        order_by = sort_column.desc() if direction == "desc" else sort_column.asc()

        result = await self._session.execute(
            select(ProductModel)
            .where(*filters)
            .order_by(order_by, ProductModel.id.asc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(m) for m in result.scalars().all()], total

    async def get_by_qr_code(self, store_id: UUID, qr_code: str) -> Product | None:
        result = await self._session.execute(
            select(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.qr_code == qr_code,
                ProductModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def qr_code_exists(self, qr_code: str, exclude_product_id: UUID | None = None) -> bool:
        filters = [ProductModel.qr_code == qr_code, ProductModel.deleted_at.is_(None)]
        if exclude_product_id is not None:
            filters.append(ProductModel.id != exclude_product_id)
        result = await self._session.execute(select(func.count()).select_from(ProductModel).where(*filters))
        return int(result.scalar_one()) > 0

    async def list_low_stock(self, store_id: UUID, limit: int = 20) -> list[Product]:
        result = await self._session.execute(
            select(ProductModel)
            .where(
                ProductModel.store_id == store_id,
                ProductModel.deleted_at.is_(None),
                ProductModel.stock <= ProductModel.min_stock,
            )
            .order_by(ProductModel.stock.asc(), ProductModel.name.asc())
            .limit(limit)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def count_by_store(self, store_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.deleted_at.is_(None),
            )
        )
        return int(result.scalar_one())

    async def count_low_stock(self, store_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.deleted_at.is_(None),
                ProductModel.stock <= ProductModel.min_stock,
            )
        )
        return int(result.scalar_one())

    async def count_out_of_stock(self, store_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.deleted_at.is_(None),
                ProductModel.stock <= 0,
            )
        )
        return int(result.scalar_one())

    async def list_for_export(self, store_id: UUID) -> list[Product]:
        result = await self._session.execute(
            select(ProductModel)
            .where(ProductModel.store_id == store_id, ProductModel.deleted_at.is_(None))
            .order_by(ProductModel.name.asc(), ProductModel.id.asc())
        )
        return [self._to_entity(model) for model in result.scalars().all()]

    async def delete(self, store_id: UUID, product_id: UUID) -> None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.store_id == store_id, ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.deleted_at = datetime.now(timezone.utc)
            model.is_active = False
            await self._session.flush()

    async def update_stock(
        self,
        store_id: UUID,
        product_id: UUID,
        quantity: int,
        *,
        movement_type: str,
        reason: str | None = None,
        sale_id: UUID | None = None,
        device_id: str | None = None,
    ) -> Product:
        result = await self._session.execute(
            select(ProductModel).where(
                ProductModel.store_id == store_id,
                ProductModel.id == product_id,
                ProductModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError("Producto no encontrado")
        if model.stock + quantity < 0:
            raise ValueError(f"Stock insuficiente: {model.stock} < {abs(quantity)}")
        model.stock += quantity
        model.version += 1
        model.updated_at = datetime.now(timezone.utc)
        self._session.add(
            StockMovementModel(
                store_id=store_id,
                product_id=product_id,
                sale_id=sale_id,
                movement_type=movement_type,
                quantity_delta=quantity,
                stock_after=model.stock,
                reason=reason,
                device_id=device_id,
            )
        )
        await self._session.flush()
        return self._to_entity(model)
