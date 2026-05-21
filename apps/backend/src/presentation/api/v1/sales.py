from uuid import UUID

from fastapi import APIRouter, Depends
from src.application.dto.sale_dto import CreateSaleDTO, SaleResponseDTO, VoidSaleDTO
from src.application.use_cases.sales.create_sale import CreateSaleUseCase, CreateSaleInput, SaleItemInput
from src.application.use_cases.sales.list_sales import ListSalesUseCase
from src.application.use_cases.sales.get_sale import GetSaleUseCase
from src.application.use_cases.sales.void_sale import VoidSaleInput, VoidSaleUseCase
from src.presentation.dependencies import get_current_user, get_product_repo, get_sale_repo, require_owner
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.sale_repository import SaleRepository

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleResponseDTO])
async def list_sales(
    user: dict = Depends(get_current_user),
    repo: SaleRepository = Depends(get_sale_repo),
):
    use_case = ListSalesUseCase(repo)
    return await use_case.execute(user["store_id"])


@router.post("", response_model=SaleResponseDTO, status_code=201)
async def create_sale(
    dto: CreateSaleDTO,
    user: dict = Depends(get_current_user),
    sale_repo: SaleRepository = Depends(get_sale_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
):
    use_case = CreateSaleUseCase(sale_repo, product_repo)
    items = [SaleItemInput(product_id=i.product_id, quantity=i.quantity) for i in dto.items]
    sale = await use_case.execute(CreateSaleInput(
        store_id=UUID(str(user["store_id"])),
        items=items,
        payment_method=dto.payment_method.value,
        device_id=dto.device_id,
        customer_name=dto.customer_name,
    ))
    return sale


@router.get("/{sale_id}", response_model=SaleResponseDTO)
async def get_sale(
    sale_id: UUID,
    user: dict = Depends(get_current_user),
    repo: SaleRepository = Depends(get_sale_repo),
):
    use_case = GetSaleUseCase(repo)
    return await use_case.execute(UUID(str(user["store_id"])), sale_id)


@router.post("/{sale_id}/void", response_model=SaleResponseDTO)
async def void_sale(
    sale_id: UUID,
    dto: VoidSaleDTO,
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    sale_repo: SaleRepository = Depends(get_sale_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
):
    return await VoidSaleUseCase(sale_repo, product_repo).execute(
        VoidSaleInput(
            store_id=UUID(str(user["store_id"])),
            sale_id=sale_id,
            reason=dto.reason,
        )
    )
