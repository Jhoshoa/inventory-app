from dataclasses import dataclass

from src.application.exceptions import NotFoundError
from src.domain.entities.store import Store
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class GetPublicStorefrontResult:
    store: Store


class GetPublicStorefrontUseCase:
    """Resuelve una tienda por su slug publico para el catalogo (Nivel 1/2).

    Si el slug no existe o el storefront esta desactivado, se trata igual
    (NotFoundError) para no revelar si un slug existio alguna vez.
    """

    def __init__(self, store_repo: IStoreRepository):
        self._store_repo = store_repo

    async def execute(self, slug: str) -> GetPublicStorefrontResult:
        store = await self._store_repo.get_by_storefront_slug(slug)
        if store is None or not store.storefront_enabled:
            raise NotFoundError("Catalogo no encontrado")
        return GetPublicStorefrontResult(store=store)
