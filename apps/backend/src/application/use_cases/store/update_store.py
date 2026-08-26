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

        if store.allow_percentage_discount and store.max_percentage_discount <= 0:
            raise ValueError(
                "Para habilitar el descuento por porcentaje, define un porcentaje maximo mayor a 0"
            )
        if store.allow_manual_discount and store.max_manual_discount_amount <= 0:
            raise ValueError(
                "Para habilitar la rebaja manual, define un monto maximo mayor a 0"
            )

        return await self._repo.save(store)
