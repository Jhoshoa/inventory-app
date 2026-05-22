from dataclasses import dataclass
from uuid import UUID
from src.domain.entities.sale import Sale, SaleItem
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.application.exceptions import ConflictError, NotFoundError, StockConflictError


@dataclass
class SaleItemInput:
    product_id: UUID
    quantity: int


@dataclass
class CreateSaleInput:
    store_id: UUID
    user_id: UUID
    items: list[SaleItemInput]
    payment_method: str = "efectivo"
    device_id: str | None = None
    customer_name: str | None = None


class CreateSaleUseCase:
    def __init__(
        self,
        sale_repo: ISaleRepository,
        product_repo: IProductRepository,
        business_day_repo: IStoreBusinessDayRepository,
    ):
        self._sale_repo = sale_repo
        self._product_repo = product_repo
        self._business_day_repo = business_day_repo

    async def execute(self, input: CreateSaleInput) -> Sale:
        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            raise ConflictError("La tienda esta cerrada. Un owner debe abrir la jornada para vender.")

        sale_items: list[SaleItem] = []
        product_ids = [item.product_id for item in input.items]
        if len(set(product_ids)) != len(product_ids):
            raise ValueError("La venta no puede incluir productos duplicados")

        for item in input.items:
            product = await self._product_repo.get_by_id(input.store_id, item.product_id)
            if not product:
                raise NotFoundError(f"Producto no encontrado: {item.product_id}")
            if not product.can_sell(item.quantity):
                raise StockConflictError(
                    product_id=str(product.id),
                    product_name=product.name,
                    available_stock=product.stock,
                    requested_quantity=item.quantity,
                )
            sale_item = SaleItem.create(
                product_id=product.id,
                product_name=product.name,
                quantity=item.quantity,
                unit_price=product.price,
            )
            sale_items.append(sale_item)

        sale = Sale.create(
            store_id=input.store_id,
            items=sale_items,
            payment_method=input.payment_method,
            business_day_id=business_day.id,
            business_date=business_day.business_date,
            created_by_user_id=input.user_id,
            device_id=input.device_id,
            customer_name=input.customer_name,
        )
        sale = await self._sale_repo.save(sale)

        for item in input.items:
            await self._product_repo.update_stock(
                input.store_id,
                item.product_id,
                -item.quantity,
                movement_type="sale",
                sale_id=sale.id,
                device_id=input.device_id,
            )

        return sale
