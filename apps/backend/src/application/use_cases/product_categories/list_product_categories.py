from dataclasses import dataclass
from uuid import UUID

from src.application.dto.product_category_dto import ProductCategoryListResponseDTO
from src.application.use_cases.product_categories.create_product_category import _to_response
from src.domain.repositories.product_category_repository import IProductCategoryRepository


@dataclass
class ListProductCategoriesInput:
    store_id: UUID
    include_inactive: bool = False


class ListProductCategoriesUseCase:
    def __init__(self, repo: IProductCategoryRepository):
        self._repo = repo

    async def execute(self, input: ListProductCategoriesInput) -> ProductCategoryListResponseDTO:
        categories = await self._repo.list_by_store(input.store_id, include_inactive=input.include_inactive)
        return ProductCategoryListResponseDTO(items=[_to_response(category) for category in categories])
