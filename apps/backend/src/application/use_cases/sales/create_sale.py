from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID
from src.domain.entities.sale import Sale, SaleItem
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.product_repository import IProductRepository


@dataclass
class SaleItemInput:
    product_id: UUID
    quantity: int


@dataclass
class CreateSaleInput:
    store_id: UUID
    items: list[SaleItemInput]
    payment_method: str = "efectivo"


class CreateSaleUseCase:
    def __init__(self, sale_repo: ISaleRepository, product_repo: IProductRepository):
        self._sale_repo = sale_repo
        self._product_repo = product_repo

    async def execute(self, input: CreateSaleInput) -> Sale:
        sale_items: list[SaleItem] = []
        for item in input.items:
            product = await self._product_repo.get_by_id(item.product_id)
            if not product:
                raise ValueError(f"Producto no encontrado: {item.product_id}")
            if not product.can_sell(item.quantity):
                raise ValueError(f"Stock insuficiente para {product.name}: {product.stock} < {item.quantity}")
            sale_item = SaleItem.create(
                product_id=product.id,
                product_name=product.name,
                quantity=item.quantity,
                unit_price=product.price,
            )
            sale_items.append(sale_item)
            product.reduce_stock(item.quantity)
            await self._product_repo.save(product)

        sale = Sale.create(
            store_id=input.store_id,
            items=sale_items,
            payment_method=input.payment_method,
        )
        return await self._sale_repo.save(sale)
