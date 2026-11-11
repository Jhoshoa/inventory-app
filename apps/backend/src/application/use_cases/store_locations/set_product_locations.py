from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.store_location import (
    MAX_LOCATIONS_PER_PRODUCT,
    ProductLocation,
    ProductLocationKind,
)
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.store_location_repository import IStoreLocationRepository


@dataclass
class SetProductLocationsInput:
    store_id: UUID
    product_id: UUID
    items: list[tuple[UUID, ProductLocationKind]]


class SetProductLocationsUseCase:
    def __init__(self, location_repo: IStoreLocationRepository, product_repo: IProductRepository):
        self._location_repo = location_repo
        self._product_repo = product_repo

    async def execute(self, input: SetProductLocationsInput) -> list[ProductLocation]:
        if await self._product_repo.get_by_id(input.store_id, input.product_id) is None:
            raise NotFoundError("Producto no encontrado")

        # La misma ubicacion dos veces: queda la primera (y su tipo).
        items: list[tuple[UUID, ProductLocationKind]] = []
        seen: set[UUID] = set()
        for location_id, kind in input.items:
            if location_id not in seen:
                seen.add(location_id)
                items.append((location_id, kind))
        if len(items) > MAX_LOCATIONS_PER_PRODUCT:
            raise ValueError(f"Un producto puede tener hasta {MAX_LOCATIONS_PER_PRODUCT} ubicaciones")

        found = await self._location_repo.get_by_ids(input.store_id, [location_id for location_id, _ in items])
        if len(found) != len(items):
            raise NotFoundError("Ubicacion no encontrada")

        await self._location_repo.set_for_product(input.store_id, input.product_id, items)
        return (await self._location_repo.for_products(input.store_id, [input.product_id])).get(input.product_id, [])
