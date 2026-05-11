from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.sale import Sale, SaleItem
from src.domain.repositories.sale_repository import ISaleRepository
from src.infrastructure.database.models.sale_model import SaleModel, SaleItemModel


class SaleRepository(ISaleRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, sale: Sale) -> Sale:
        model = SaleModel(
            id=sale.id,
            store_id=sale.store_id,
            total=sale.total,
            payment_method=sale.payment_method,
            status=sale.status,
        )
        for item in sale.items:
            item_model = SaleItemModel(
                id=item.id,
                sale_id=sale.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            model.items.append(item_model)
        self._session.add(model)
        await self._session.commit()
        return sale

    async def get_by_id(self, sale_id: UUID) -> Sale | None:
        result = await self._session.execute(
            select(SaleModel).where(SaleModel.id == sale_id).options(selectinload(SaleModel.items))
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        items = [
            SaleItem(id=i.id, product_id=i.product_id, product_name=i.product_name, quantity=i.quantity, unit_price=i.unit_price, subtotal=i.subtotal)
            for i in model.items
        ]
        return Sale(id=model.id, store_id=model.store_id, items=items, total=model.total, payment_method=model.payment_method, status=model.status, created_at=model.created_at)

    async def list_by_store(self, store_id: UUID) -> list[Sale]:
        result = await self._session.execute(
            select(SaleModel).where(SaleModel.store_id == store_id).options(selectinload(SaleModel.items))
        )
        sales = []
        for model in result.scalars().all():
            items = [
                SaleItem(id=i.id, product_id=i.product_id, product_name=i.product_name, quantity=i.quantity, unit_price=i.unit_price, subtotal=i.subtotal)
                for i in model.items
            ]
            sales.append(Sale(id=model.id, store_id=model.store_id, items=items, total=model.total, payment_method=model.payment_method, status=model.status, created_at=model.created_at))
        return sales
