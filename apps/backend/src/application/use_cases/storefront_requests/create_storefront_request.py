from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.application.use_cases.storefront.get_public_storefront import (
    GetPublicStorefrontUseCase,
)
from src.domain.entities.storefront_request import StorefrontRequest
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
