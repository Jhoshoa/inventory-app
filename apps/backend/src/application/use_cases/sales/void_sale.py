from dataclasses import dataclass
from uuid import UUID

from src.application.exceptions import ConflictError, NotFoundError
from src.domain.entities.sale import Sale
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.sale_repository import ISaleRepository


@dataclass
class VoidSaleInput:
    store_id: UUID
    sale_id: UUID
    reason: str


class VoidSaleUseCase:
    def __init__(self, sale_repo: ISaleRepository, product_repo: IProductRepository):
        self._sale_repo = sale_repo
        self._product_repo = product_repo

    async def execute(self, input: VoidSaleInput) -> Sale:
        sale = await self._sale_repo.get_by_id(input.store_id, input.sale_id)
        if not sale:
            raise NotFoundError("Venta no encontrada")
        if sale.status == "voided":
            raise ConflictError("La venta ya fue anulada")
        if sale.status != "completed":
            raise ConflictError("Solo se pueden anular ventas completadas")

        for item in sale.items:
            await self._product_repo.update_stock(
                input.store_id,
                item.product_id,
                item.quantity,
                movement_type="sale_void",
                reason=input.reason,
                sale_id=sale.id,
                device_id=sale.device_id,
            )

        voided = await self._sale_repo.mark_voided(input.store_id, input.sale_id, input.reason)
        if not voided:
            raise NotFoundError("Venta no encontrada")
        return voided
