from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.store import Store
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class UpdateStoreInput:
    store_id: UUID
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    allow_percentage_discount: bool | None = None
    max_percentage_discount: Decimal | None = None
    allow_manual_discount: bool | None = None
    max_manual_discount_amount: Decimal | None = None
    allow_cashier_discount_override: bool | None = None
    storefront_enabled: bool | None = None
    storefront_slug: str | None = None
    storefront_logo_url: str | None = None
    storefront_banner_url: str | None = None
    storefront_color_primary: str | None = None
    storefront_color_secondary: str | None = None
    storefront_description: str | None = None
    storefront_whatsapp: str | None = None


class UpdateStoreUseCase:
    def __init__(self, repo: IStoreRepository):
        self._repo = repo

    async def execute(self, input: UpdateStoreInput) -> Store:
        store = await self._repo.get_by_id(input.store_id)
        if not store:
            raise NotFoundError("Tienda no encontrada")
        if input.name is not None:
            store.name = input.name
        if input.address is not None:
            store.address = input.address
        if input.phone is not None:
            store.phone = input.phone
        if input.allow_percentage_discount is not None:
            store.allow_percentage_discount = input.allow_percentage_discount
        if input.max_percentage_discount is not None:
            store.max_percentage_discount = input.max_percentage_discount
        if input.allow_manual_discount is not None:
            store.allow_manual_discount = input.allow_manual_discount
        if input.max_manual_discount_amount is not None:
            store.max_manual_discount_amount = input.max_manual_discount_amount
        if input.allow_cashier_discount_override is not None:
            store.allow_cashier_discount_override = input.allow_cashier_discount_override
        if input.storefront_slug is not None:
            if await self._repo.storefront_slug_exists(input.storefront_slug, exclude_store_id=store.id):
                raise ValueError("Ese slug ya esta en uso por otra tienda")
            store.storefront_slug = input.storefront_slug
        if input.storefront_logo_url is not None:
            store.storefront_logo_url = input.storefront_logo_url or None
        if input.storefront_banner_url is not None:
            store.storefront_banner_url = input.storefront_banner_url or None
        if input.storefront_color_primary is not None:
            store.storefront_color_primary = input.storefront_color_primary or None
        if input.storefront_color_secondary is not None:
            store.storefront_color_secondary = input.storefront_color_secondary or None
        if input.storefront_description is not None:
            store.storefront_description = input.storefront_description or None
        if input.storefront_whatsapp is not None:
            store.storefront_whatsapp = input.storefront_whatsapp or None
        if input.storefront_enabled is not None:
            if input.storefront_enabled and not store.storefront_slug:
                raise ValueError("Define un slug antes de activar el catalogo publico")
            store.storefront_enabled = input.storefront_enabled

        store.storefront_tier = (
            "branded"
            if any(
                [
                    store.storefront_logo_url,
                    store.storefront_banner_url,
                    store.storefront_color_primary,
                    store.storefront_color_secondary,
                ]
            )
            else ("standard" if store.storefront_slug else "none")
        )

        if store.allow_percentage_discount and store.max_percentage_discount <= 0:
            raise ValueError(
                "Para habilitar el descuento por porcentaje, define un porcentaje maximo mayor a 0"
            )
        if store.allow_manual_discount and store.max_manual_discount_amount <= 0:
            raise ValueError(
                "Para habilitar la rebaja manual, define un monto maximo mayor a 0"
            )

        return await self._repo.save(store)
