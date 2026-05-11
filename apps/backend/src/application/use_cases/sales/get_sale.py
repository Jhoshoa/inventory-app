from uuid import UUID
from src.domain.entities.sale import Sale
from src.domain.repositories.sale_repository import ISaleRepository


class GetSaleUseCase:
    def __init__(self, repo: ISaleRepository):
        self._repo = repo

    async def execute(self, sale_id: UUID) -> Sale:
        sale = await self._repo.get_by_id(sale_id)
        if not sale:
            raise ValueError("Venta no encontrada")
        return sale
