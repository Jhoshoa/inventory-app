from dataclasses import dataclass
from uuid import UUID

from src.application.dto.product_category_dto import ProductCategoryResponseDTO
from src.application.exceptions import ConflictError
from src.domain.entities.product_category import ProductCategory
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)


@dataclass
class CreateProductCategoryInput:
    store_id: UUID
    name: str
    sku_prefix: str


class CreateProductCategoryUseCase:
    def __init__(self, repo: IProductCategoryRepository):
        self._repo = repo

    async def execute(self, input: CreateProductCategoryInput) -> ProductCategoryResponseDTO:
        category = ProductCategory.create(
            store_id=input.store_id,
            name=input.name,
            sku_prefix=input.sku_prefix,
        )
        if await self._repo.name_exists(input.store_id, category.name):
            raise ConflictError("Ya existe una categoria con ese nombre")
        if await self._repo.sku_prefix_exists(input.store_id, category.sku_prefix):
            raise ConflictError("Ya existe una categoria con ese prefijo SKU")
        return _to_response(await self._repo.save(category))


def _to_response(category: ProductCategory) -> ProductCategoryResponseDTO:
    return ProductCategoryResponseDTO(
        id=category.id,
        name=category.name,
        sku_prefix=category.sku_prefix,
        next_sku_number=category.next_sku_number,
        is_active=category.is_active,
    )
