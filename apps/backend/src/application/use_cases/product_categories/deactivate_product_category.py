from dataclasses import dataclass
from uuid import UUID

from src.application.dto.product_category_dto import ProductCategoryResponseDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.product_categories.create_product_category import (
    _to_response,
)
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)


@dataclass
class DeactivateProductCategoryInput:
    store_id: UUID
    category_id: UUID


class DeactivateProductCategoryUseCase:
    def __init__(self, repo: IProductCategoryRepository):
        self._repo = repo

    async def execute(self, input: DeactivateProductCategoryInput) -> ProductCategoryResponseDTO:
        category = await self._repo.get_by_id(input.store_id, input.category_id)
        if category is None:
            raise NotFoundError("Categoria no encontrada")
        category.deactivate()
        return _to_response(await self._repo.save(category))
