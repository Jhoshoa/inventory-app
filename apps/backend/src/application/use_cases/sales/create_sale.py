from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError, StockConflictError
from src.application.use_cases.sales.discount_engine import (
    compute_manual_discount_amount,
    resolve_discount,
)
from src.domain.entities.sale import Sale, SaleItem
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.store_business_day_repository import (
    IStoreBusinessDayRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


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
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)
    discount_source_override: str | None = None
    sale_id: UUID | None = None
    created_at: datetime | None = None


class CreateSaleUseCase:
    """Crea una venta resolviendo cual descuento se aplica, entre el descuento
    propio de cada producto (configurado por el owner en el catalogo) y el
    descuento manual que el cajero pide al cobrar (porcentaje o rebaja fija).

    Regla de negocio: nunca se aplican ambos a la vez. Por defecto gana el que
    resulte en mayor ahorro para el cliente. El cajero solo puede elegir una
    fuente distinta a la automatica si el owner habilito
    `allow_cashier_discount_override` en la configuracion de la tienda.
    """

    def __init__(
        self,
        sale_repo: ISaleRepository,
        product_repo: IProductRepository,
        business_day_repo: IStoreBusinessDayRepository,
        store_repo: IStoreRepository,
    ):
        self._sale_repo = sale_repo
        self._product_repo = product_repo
        self._business_day_repo = business_day_repo
        self._store_repo = store_repo

    async def execute(self, input: CreateSaleInput) -> Sale:
        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            raise ConflictError("La tienda esta cerrada. Un owner debe abrir la jornada para vender.")

        product_ids = [item.product_id for item in input.items]
        if len(set(product_ids)) != len(product_ids):
            raise ValueError("La venta no puede incluir productos duplicados")

        products = await self._product_repo.get_by_ids(input.store_id, product_ids)
        product_map = {p.id: p for p in products}

        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        sale_items: list[SaleItem] = []
        product_discount_amount = Decimal(0)
        for item in input.items:
            product = product_map.get(item.product_id)
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
            product_discount_amount += product.discount_per_unit * item.quantity

        subtotal = sum((si.subtotal for si in sale_items), Decimal(0))
        product_discount_amount = min(product_discount_amount, subtotal)

        manual_discount_type = input.discount_type
        manual_discount_value = input.discount_value
        manual_discount_amount = compute_manual_discount_amount(
            store, manual_discount_type, manual_discount_value, subtotal
        )

        final_type, final_value = resolve_discount(
            store_allows_override=store.allow_cashier_discount_override,
            override=input.discount_source_override,
            product_discount_amount=product_discount_amount,
            manual_discount_type=manual_discount_type,
            manual_discount_value=manual_discount_value,
            manual_discount_amount=manual_discount_amount,
        )

        sale = Sale.create(
            store_id=input.store_id,
            items=sale_items,
            payment_method=input.payment_method,
            business_day_id=business_day.id,
            business_date=business_day.business_date,
            created_by_user_id=input.user_id,
            device_id=input.device_id,
            customer_name=input.customer_name,
            discount_type=final_type,
            discount_value=final_value,
            id=input.sale_id,
            created_at=input.created_at,
        )
        sale = await self._sale_repo.save(sale)

        await self._product_repo.batch_update_stock(
            input.store_id,
            [
                (item.product_id, -item.quantity, "sale", None, sale.id, input.device_id)
                for item in input.items
            ],
        )

        return sale
