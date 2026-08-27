from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.storefront_request import STOREFRONT_REQUEST_STATUSES, StorefrontRequest
from src.domain.repositories.storefront_request_repository import (
    IStorefrontRequestRepository,
)


@dataclass
class UpdateStorefrontRequestStatusInput:
    store_id: UUID
    request_id: UUID
    status: str


class UpdateStorefrontRequestStatusUseCase:
    def __init__(self, repo: IStorefrontRequestRepository):
        self._repo = repo

    async def execute(self, data: UpdateStorefrontRequestStatusInput) -> StorefrontRequest:
        if data.status not in STOREFRONT_REQUEST_STATUSES:
            raise ValueError("Estado invalido")
        updated = await self._repo.update_status(data.store_id, data.request_id, data.status)
        if updated is None:
            raise NotFoundError("Solicitud no encontrada")
        return updated
