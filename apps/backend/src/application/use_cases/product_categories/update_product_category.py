from dataclasses import dataclass
from uuid import UUID

from src.application.dto.product_category_dto import ProductCategoryResponseDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.product_categories.create_product_category import (
    _to_response,
)
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)


@dataclass
class UpdateProductCategoryInput:
    store_id: UUID
    category_id: UUID
    name: str | None = None
    sku_prefix: str | None = None


class UpdateProductCategoryUseCase:
    def __init__(self, repo: IProductCategoryRepository):
        self._repo = repo

    async def execute(self, input: UpdateProductCategoryInput) -> ProductCategoryResponseDTO:
        category = await self._repo.get_by_id(input.store_id, input.category_id)
        if category is None:
            raise NotFoundError("Categoria no encontrada")

        next_name = input.name.strip() if input.name is not None else category.name
        next_prefix = input.sku_prefix.strip().upper() if input.sku_prefix is not None else category.sku_prefix

        if await self._repo.name_exists(input.store_id, next_name, exclude_category_id=category.id):
            raise ConflictError("Ya existe una categoria con ese nombre")
        if await self._repo.sku_prefix_exists(input.store_id, next_prefix, exclude_category_id=category.id):
            raise ConflictError("Ya existe una categoria con ese prefijo SKU")

        category.update(name=input.name, sku_prefix=input.sku_prefix)
        return _to_response(await self._repo.save(category))
