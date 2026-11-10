from dataclasses import dataclass
from uuid import UUID

from src.application.dto.storefront_settings_dto import storefront_settings_of
from src.application.exceptions import ApplicationError, ConflictError, NotFoundError
from src.application.use_cases.storefront.get_public_storefront import (
    GetPublicStorefrontUseCase,
)
from src.domain.entities.product import product_discount_per_unit
from src.domain.entities.storefront_request import (
    StorefrontRequest,
    StorefrontRequestItem,
)
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.storefront_request_repository import (
    IStorefrontRequestRepository,
)
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class CreateStorefrontRequestInput:
    slug: str
    product_id: UUID
    customer_name: str
    customer_phone: str
    note: str | None = None


class CreateStorefrontRequestUseCase:
    def __init__(
        self,
        store_repo: IStoreRepository,
        product_repo: IProductRepository,
        request_repo: IStorefrontRequestRepository,
    ):
        self._store_repo = store_repo
        self._product_repo = product_repo
        self._request_repo = request_repo

    async def execute(self, data: CreateStorefrontRequestInput) -> StorefrontRequest:
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(data.slug)
        product = await self._product_repo.get_public_by_id(resolved.store.id, data.product_id)
        if product is None:
            raise NotFoundError("Producto no encontrado")

        request = StorefrontRequest.create(
            store_id=resolved.store.id,
            product_id=product.id,
            product_name=product.name,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
            note=data.note,
        )
        return await self._request_repo.save(request)


MAX_LINE_QUANTITY = 999


@dataclass
class StorefrontOrderLineInput:
    product_id: UUID
    quantity: int


@dataclass
class CreateStorefrontOrderInput:
    slug: str
    items: list[StorefrontOrderLineInput]
    customer_name: str
    customer_phone: str
    note: str | None = None
    delivery_method: str | None = None


class CreateStorefrontOrderUseCase:
    """Boleta del catalogo: un pedido con varios productos.

    Nombres y precios salen de la base al momento del pedido (con el
    descuento vigente), nunca del navegador. No reserva stock, igual que la
    solicitud de un producto: la tienda confirma por WhatsApp.
    """

    def __init__(
        self,
        store_repo: IStoreRepository,
        product_repo: IProductRepository,
        request_repo: IStorefrontRequestRepository,
    ):
        self._store_repo = store_repo
        self._product_repo = product_repo
        self._request_repo = request_repo

    async def execute(self, data: CreateStorefrontOrderInput) -> StorefrontRequest:
        resolved = await GetPublicStorefrontUseCase(self._store_repo).execute(data.slug)
        store = resolved.store
        settings = storefront_settings_of(store)

        # El mismo producto dos veces en la boleta es una sola linea.
        quantities: dict[UUID, int] = {}
        for line in data.items:
            quantities[line.product_id] = min(quantities.get(line.product_id, 0) + line.quantity, MAX_LINE_QUANTITY)

        products = await self._product_repo.list_public_by_ids(store.id, list(quantities))
        by_id = {p.id: p for p in products}
        unavailable = [pid for pid in quantities if pid not in by_id or by_id[pid].stock <= 0]
        if unavailable:
            raise ConflictError(
                "Algunos productos de tu boleta ya no estan disponibles. Quitalos y vuelve a enviarla.",
                extra={"unavailable_product_ids": [str(pid) for pid in unavailable]},
            )

        delivery_method = self._resolve_delivery(
            data.delivery_method, pickup=settings.pickup_enabled, delivery=settings.delivery_enabled
        )

        items = []
        for product_id, quantity in quantities.items():
            product = by_id[product_id]
            unit_price = product.price - product_discount_per_unit(
                product.price, product.discount_type, product.discount_value, product.discount_ends_at
            )
            items.append(
                StorefrontRequestItem(
                    product_id=product.id,
                    product_name=product.name,
                    unit=product.unit,
                    quantity=quantity,
                    unit_price=unit_price,
                )
            )

        order = StorefrontRequest.create_order(
            store_id=store.id,
            items=items,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
            note=data.note,
            delivery_method=delivery_method,
        )
        return await self._request_repo.save(order)

    @staticmethod
    def _resolve_delivery(requested: str | None, *, pickup: bool, delivery: bool) -> str | None:
        offered = [method for method, enabled in (("pickup", pickup), ("delivery", delivery)) if enabled]
        if requested is not None:
            if requested not in offered:
                raise ApplicationError("Esta tienda no ofrece esa forma de entrega")
            return requested
        if len(offered) == 2:
            raise ApplicationError("Elige si recoges en tienda o quieres envio a domicilio")
        return offered[0] if offered else None
