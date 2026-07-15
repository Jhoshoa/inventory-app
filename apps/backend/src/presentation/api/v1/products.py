import time
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dto.product_dto import (
    CreateProductDTO,
    ImportJobListResponseDTO,
    ImportJobResponseDTO,
    ProductCompactListResponseDTO,
    ProductCompactResponseDTO,
    ProductListResponseDTO,
    ProductResponseDTO,
    ProductSortField,
    ProductStockFilter,
    RowErrorDTO,
    SortDirection,
    StockAdjustmentDTO,
    UpdateProductDTO,
)
from src.application.ports.image_validator import (
    ALLOWED_MIME_TYPES,
    validate_image_magic_bytes,
)
from src.application.ports.photo_storage import IPhotoStorage
from src.config.settings import settings
from src.infrastructure.services.cloudinary.photo_storage import (
    parse_public_id_from_url,
)
from src.application.dto.stock_movement_dto import StockMovementListResponseDTO
from src.application.use_cases.products.create_product import (
    CreateProductInput,
    CreateProductUseCase,
)
from src.application.use_cases.products.delete_product import DeleteProductUseCase
from src.application.use_cases.products.get_product import GetProductUseCase
from src.application.use_cases.products.get_product_by_qr import GetProductByQRUseCase
from src.application.use_cases.products.import_products_csv import (
    ImportProductsCsvUseCase,
)
from src.application.use_cases.products.list_low_stock_products import (
    ListLowStockProductsUseCase,
)
from src.application.use_cases.products.search_products import (
    SearchProductsInput,
    SearchProductsUseCase,
)
from src.application.use_cases.products.update_product import (
    UpdateProductInput,
    UpdateProductUseCase,
)
from src.application.use_cases.products.update_stock import UpdateStockUseCase
from src.application.use_cases.stock_movements.list_product_stock_movements import (
    ListProductStockMovementsInput,
    ListProductStockMovementsUseCase,
)
from src.infrastructure.database.repositories.import_job_repository import (
    ImportJobRepository,
)
from src.infrastructure.database.repositories.product_category_repository import (
    ProductCategoryRepository,
)
from src.infrastructure.database.repositories.product_repository import (
    ProductRepository,
)
from src.infrastructure.database.repositories.stock_movement_repository import (
    StockMovementRepository,
)
from src.presentation.dependencies import (
    get_db_session,
    get_import_job_repo,
    get_photo_storage,
    get_product_category_repo,
    get_product_repo,
    get_stock_movement_repo,
    require_active_user,
    require_owner,
)

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponseDTO)
async def list_products(
    q: str | None = Query(default=None, min_length=3, max_length=100),
    category: str | None = Query(default=None, max_length=50),
    category_id: UUID | None = Query(default=None),
    stock: ProductStockFilter = ProductStockFilter.ALL,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort: ProductSortField = ProductSortField.NAME,
    direction: SortDirection = SortDirection.ASC,
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    products, total = await SearchProductsUseCase(repo).execute(
        SearchProductsInput(
            store_id=user.store_id,
            q=q,
            category=category,
            category_id=category_id,
            stock=stock.value,
            limit=limit,
            offset=offset,
            sort=sort.value,
            direction=direction.value,
        )
    )
    return ProductListResponseDTO(items=products, total=total, limit=limit, offset=offset)


@router.get("/pos", response_model=ProductCompactListResponseDTO)
async def list_products_for_pos(
    q: str | None = Query(default=None, min_length=3, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    products, total = await SearchProductsUseCase(repo).execute(
        SearchProductsInput(
            store_id=user.store_id,
            q=q,
            limit=limit,
            offset=offset,
            sort="name",
            direction="asc",
        )
    )
    return ProductCompactListResponseDTO(
        items=[
            ProductCompactResponseDTO(
                id=product.id,
                name=product.name,
                price=product.price,
                stock=product.stock,
                unit=product.unit,
                qr_code=product.qr_code,
            )
            for product in products
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/low-stock", response_model=list[ProductResponseDTO])
async def list_low_stock_products(
    limit: int = Query(default=20, ge=1, le=100),
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await ListLowStockProductsUseCase(repo).execute(user.store_id, limit)


@router.get("/qr/{qr_code}", response_model=ProductResponseDTO)
async def get_product_by_qr(
    qr_code: str,
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await GetProductByQRUseCase(repo).execute(user.store_id, qr_code)


@router.get("/{product_id}/stock-movements", response_model=StockMovementListResponseDTO)
async def list_product_stock_movements(
    product_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_active_user),
    product_repo: ProductRepository = Depends(get_product_repo),
    movement_repo: StockMovementRepository = Depends(get_stock_movement_repo),
):
    movements, total = await ListProductStockMovementsUseCase(movement_repo, product_repo).execute(
        ListProductStockMovementsInput(
            store_id=user.store_id,
            product_id=product_id,
            limit=limit,
            offset=offset,
        )
    )
    return StockMovementListResponseDTO(items=movements, total=total, limit=limit, offset=offset)


@router.post("", response_model=ProductResponseDTO, status_code=201)
async def create_product(
    dto: CreateProductDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    category_repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    product = await CreateProductUseCase(repo, category_repo).execute(
        CreateProductInput(
            store_id=user.store_id,
            name=dto.name,
            price=dto.price,
            stock=dto.stock,
            category_id=dto.category_id,
            category=dto.category,
            min_stock=dto.min_stock,
            unit=dto.unit,
            sku=dto.sku,
            cost_price=dto.cost_price,
            photo_url=dto.photo_url,
            qr_code=dto.qr_code,
        )
    )
    return product


@router.get("/{product_id}", response_model=ProductResponseDTO)
async def get_product(
    product_id: UUID,
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await GetProductUseCase(repo).execute(user.store_id, product_id)


@router.patch("/{product_id}", response_model=ProductResponseDTO)
async def update_product(
    product_id: UUID,
    dto: UpdateProductDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    category_repo: ProductCategoryRepository = Depends(get_product_category_repo),
):
    product = await UpdateProductUseCase(repo, category_repo).execute(
        UpdateProductInput(
            store_id=user.store_id,
            product_id=product_id,
            name=dto.name,
            price=dto.price,
            category_id=dto.category_id,
            category=dto.category,
            min_stock=dto.min_stock,
            unit=dto.unit,
            sku=dto.sku,
            cost_price=dto.cost_price,
            photo_url=dto.photo_url,
            qr_code=dto.qr_code,
        )
    )
    if dto.stock is not None:
        delta = dto.stock - product.stock
        if delta:
            product = await UpdateStockUseCase(repo).execute(
                user.store_id,
                product_id,
                delta,
                "stock set from product update",
            )
    return product


@router.patch("/{product_id}/stock", response_model=ProductResponseDTO)
async def adjust_stock(
    product_id: UUID,
    dto: StockAdjustmentDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
):
    return await UpdateStockUseCase(repo).execute(user.store_id, product_id, dto.quantity, dto.reason)


@router.post("/{product_id}/photo", response_model=ProductResponseDTO)
async def upload_product_photo(
    product_id: UUID,
    file: UploadFile = File(...),
    version: int | None = Form(default=None),
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    storage: IPhotoStorage = Depends(get_photo_storage),
):
    product = await repo.get_by_id(user.store_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if version is not None and product.version != version:
        raise HTTPException(
            status_code=409,
            detail="El producto fue modificado por otro usuario. Recarga la pagina.",
        )

    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Formato no soportado. Usar: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo esta vacio")

    if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"La imagen no debe superar los {settings.MAX_IMAGE_SIZE_MB} MB",
        )

    if not validate_image_magic_bytes(image_bytes):
        raise HTTPException(
            status_code=415,
            detail="El archivo no es una imagen valida (JPEG, PNG o WebP)",
        )

    if product.photo_url:
        old_public_id = parse_public_id_from_url(product.photo_url)
        if old_public_id:
            try:
                await storage.delete(old_public_id)
            except Exception:
                pass

    timestamp = int(time.time())
    public_id = f"products/{user.store_id}/{product_id}_{timestamp}"

    try:
        secure_url = await storage.upload(image_bytes, public_id)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error al subir imagen a Cloudinary: {exc}",
        ) from exc

    product.photo_url = secure_url
    product.version += 1
    updated = await repo.save(product)

    return updated


@router.delete("/{product_id}/photo", response_model=ProductResponseDTO)
async def delete_product_photo(
    product_id: UUID,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    storage: IPhotoStorage = Depends(get_photo_storage),
):
    product = await repo.get_by_id(user.store_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if not product.photo_url:
        product.version += 1
        return await repo.save(product)

    if not product.photo_url.startswith("https://res.cloudinary.com/"):
        product.photo_url = None
        product.version += 1
        return await repo.save(product)

    public_id = parse_public_id_from_url(product.photo_url)
    if public_id:
        try:
            await storage.delete(public_id)
        except Exception:
            pass

    product.photo_url = None
    product.version += 1
    updated = await repo.save(product)

    return updated


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
):
    await DeleteProductUseCase(repo).execute(user.store_id, product_id)


@router.post("/import", response_model=ImportJobResponseDTO, status_code=201)
async def import_products_csv(
    file: UploadFile = File(...),
    user=Depends(require_owner),
    session: AsyncSession = Depends(get_db_session),
):
    if file.content_type not in {"text/csv", "application/vnd.ms-excel", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Solo se aceptan archivos CSV")

    content = (await file.read()).decode("utf-8", errors="replace")

    product_repo = ProductRepository(session)
    category_repo = ProductCategoryRepository(session)
    job_repo = ImportJobRepository(session)
    use_case = ImportProductsCsvUseCase(session, product_repo, category_repo, job_repo)
    job = await use_case.execute(user.store_id, user.id, file.filename or "productos.csv", content)

    return _job_to_response(job)


@router.get("/import", response_model=ImportJobListResponseDTO)
async def list_import_jobs(
    limit: int = Query(default=50, ge=1, le=100),
    user=Depends(require_owner),
    job_repo: ImportJobRepository = Depends(get_import_job_repo),
):
    jobs = await job_repo.list_by_store(user.store_id, limit)
    return ImportJobListResponseDTO(
        items=[_job_to_response(j) for j in jobs]
    )


@router.get("/import/{job_id}", response_model=ImportJobResponseDTO)
async def get_import_job(
    job_id: UUID,
    user=Depends(require_owner),
    job_repo: ImportJobRepository = Depends(get_import_job_repo),
):
    job = await job_repo.get_by_id(user.store_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job no encontrado")
    return _job_to_response(job)


def _job_to_response(job) -> ImportJobResponseDTO:
    return ImportJobResponseDTO(
        id=job.id,
        status=job.status,
        total_rows=job.total_rows,
        imported_count=job.imported_count,
        error_count=job.error_count,
        errors=[RowErrorDTO(row=e.row, field=e.field, message=e.message) for e in job.errors],
        filename=job.filename,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )
