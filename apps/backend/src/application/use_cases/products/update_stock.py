from uuid import UUID
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository


class UpdateStockUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, product_id: UUID, quantity: int) -> Product:
        product = await self._repo.get_by_id(product_id)
        if not product:
            raise ValueError("Producto no encontrado")
        if quantity < 0 and abs(quantity) > product.stock:
            raise ValueError(f"Stock insuficiente: {product.stock} < {abs(quantity)}")
        return await self._repo.update_stock(product_id, quantity)
