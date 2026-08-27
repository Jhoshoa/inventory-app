from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import NotFoundError
from src.domain.entities.storefront_request import StorefrontRequest
from src.domain.repositories.storefront_request_repository import (
    IStorefrontRequestRepository,
)


@dataclass
class UpdateStorefrontRequestPaymentInput:
    store_id: UUID
    request_id: UUID
    payment_confirmed: bool


class UpdateStorefrontRequestPaymentUseCase:
    def __init__(self, repo: IStorefrontRequestRepository):
        self._repo = repo

    async def execute(self, data: UpdateStorefrontRequestPaymentInput) -> StorefrontRequest:
        updated = await self._repo.update_payment_confirmed(
            data.store_id, data.request_id, data.payment_confirmed
        )
        if updated is None:
            raise NotFoundError("Solicitud no encontrada")
        return updated
