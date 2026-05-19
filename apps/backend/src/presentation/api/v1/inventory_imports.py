from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile

from src.application.dto.inventory_import_dto import (
    ConfirmInventoryImportResponseDTO,
    InventoryImportListResponseDTO,
    InventoryImportResponseDTO,
    InventoryImportStatusDTO,
    UpdateInventoryImportItemDTO,
)
from src.application.ports.ocr_service import IOCRService
from src.application.ports.photo_storage import IPhotoStorage
from src.application.use_cases.inventory_imports.cancel_import import CancelInventoryImportUseCase
from src.application.use_cases.inventory_imports.confirm_import import ConfirmInventoryImportUseCase
from src.application.use_cases.inventory_imports.create_from_photo import (
    CreateInventoryImportFromPhotoInput,
    CreateInventoryImportFromPhotoUseCase,
)
from src.application.use_cases.inventory_imports.get_import import GetInventoryImportUseCase
from src.application.use_cases.inventory_imports.list_imports import ListInventoryImportsInput, ListInventoryImportsUseCase
from src.application.use_cases.inventory_imports.update_item import (
    UpdateInventoryImportItemInput,
    UpdateInventoryImportItemUseCase,
)
from src.infrastructure.database.repositories.inventory_import_repository import InventoryImportRepository
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.presentation.dependencies import (
    get_current_user,
    get_inventory_import_repo,
    get_ocr_service,
    get_photo_storage,
    get_product_repo,
    require_owner,
)

router = APIRouter(prefix="/inventory-imports", tags=["inventory-imports"])


@router.post("/from-photo", response_model=InventoryImportResponseDTO, status_code=201)
async def create_import_from_photo(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    repo: InventoryImportRepository = Depends(get_inventory_import_repo),
    ocr: IOCRService | None = Depends(get_ocr_service),
    storage: IPhotoStorage | None = Depends(get_photo_storage),
):
    image_bytes = await file.read()
    return await CreateInventoryImportFromPhotoUseCase(repo, ocr=ocr, storage=storage).execute(
        CreateInventoryImportFromPhotoInput(
            store_id=UUID(str(user["store_id"])),
            user_id=UUID(str(user["id"])) if user.get("id") else None,
            image_bytes=image_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )
    )


@router.get("", response_model=InventoryImportListResponseDTO)
async def list_inventory_imports(
    status: InventoryImportStatusDTO | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user),
    repo: InventoryImportRepository = Depends(get_inventory_import_repo),
):
    imports, total = await ListInventoryImportsUseCase(repo).execute(
        ListInventoryImportsInput(
            store_id=UUID(str(user["store_id"])),
            status=status.value if status else None,
            limit=limit,
            offset=offset,
        )
    )
    return InventoryImportListResponseDTO(items=imports, total=total, limit=limit, offset=offset)


@router.get("/{import_id}", response_model=InventoryImportResponseDTO)
async def get_inventory_import(
    import_id: UUID,
    user: dict = Depends(get_current_user),
    repo: InventoryImportRepository = Depends(get_inventory_import_repo),
):
    return await GetInventoryImportUseCase(repo).execute(UUID(str(user["store_id"])), import_id)


@router.patch("/{import_id}/items/{item_id}", response_model=InventoryImportResponseDTO)
async def update_inventory_import_item(
    import_id: UUID,
    item_id: UUID,
    dto: UpdateInventoryImportItemDTO,
    user: dict = Depends(get_current_user),
    repo: InventoryImportRepository = Depends(get_inventory_import_repo),
):
    store_id = UUID(str(user["store_id"]))
    await UpdateInventoryImportItemUseCase(repo).execute(
        UpdateInventoryImportItemInput(
            store_id=store_id,
            import_id=import_id,
            item_id=item_id,
            status=dto.status.value if dto.status else None,
            name=dto.name,
            category=dto.category,
            sku=dto.sku,
            unit=dto.unit,
            price=dto.price,
            cost_price=dto.cost_price,
            stock=dto.stock,
            min_stock=dto.min_stock,
        )
    )
    return await GetInventoryImportUseCase(repo).execute(store_id, import_id)


@router.post("/{import_id}/confirm", response_model=ConfirmInventoryImportResponseDTO)
async def confirm_inventory_import(
    import_id: UUID,
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    import_repo: InventoryImportRepository = Depends(get_inventory_import_repo),
    product_repo: ProductRepository = Depends(get_product_repo),
):
    result = await ConfirmInventoryImportUseCase(import_repo, product_repo).execute(
        UUID(str(user["store_id"])),
        import_id,
    )
    return ConfirmInventoryImportResponseDTO(
        import_id=result.inventory_import.id,
        status=result.inventory_import.status,
        created_products=result.created_products,
        failed_items=result.failed_items,
    )


@router.post("/{import_id}/cancel", response_model=InventoryImportResponseDTO)
async def cancel_inventory_import(
    import_id: UUID,
    user: dict = Depends(get_current_user),
    repo: InventoryImportRepository = Depends(get_inventory_import_repo),
):
    return await CancelInventoryImportUseCase(repo).execute(UUID(str(user["store_id"])), import_id)
