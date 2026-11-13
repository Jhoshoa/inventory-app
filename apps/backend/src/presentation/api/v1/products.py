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
from src.application.dto.product_batch_dto import (
    ProductBatchListResponseDTO,
    ProductBatchResponseDTO,
)
from src.application.dto.stock_movement_dto import StockMovementListResponseDTO
from src.application.dto.store_location_dto import (
    ProductLocationResponseDTO,
    SetProductLocationsDTO,
)
from src.application.ports.image_validator import (
    ALLOWED_MIME_TYPES,
    validate_image_magic_bytes,
)
from src.application.ports.photo_storage import IPhotoStorage
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
from src.application.use_cases.products.list_product_batches import (
    ListProductBatchesUseCase,
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
from src.application.use_cases.store_day._business_date import local_business_date
from src.application.use_cases.store_locations.set_product_locations import (
    SetProductLocationsInput,
    SetProductLocationsUseCase,
)
from src.application.use_cases.stock_movements.list_product_stock_movements import (
    ListProductStockMovementsInput,
    ListProductStockMovementsUseCase,
)
from src.config.settings import settings
from src.domain.entities.product import Product
from src.domain.entities.product_batch import DEFAULT_ALERT_DAYS, NewBatch
from src.domain.entities.store_location import ProductLocation
from src.infrastructure.database.repositories.import_job_repository import (
    ImportJobRepository,
)
from src.infrastructure.database.repositories.product_batch_repository import (
    ProductBatchRepository,
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
from src.infrastructure.database.repositories.store_location_repository import (
    StoreLocationRepository,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.services.cloudinary.photo_storage import (
    parse_public_id_from_url,
)
from src.presentation.dependencies import (
    get_db_session,
    get_import_job_repo,
    get_photo_storage,
    get_product_batch_repo,
    get_product_category_repo,
    get_product_repo,
    get_stock_movement_repo,
    get_store_location_repo,
    get_store_repo,
    require_active_user,
    require_owner,
)

router = APIRouter(prefix="/products", tags=["products"])


def _location_dtos(links: list[ProductLocation]) -> list[ProductLocationResponseDTO]:
    return [
        ProductLocationResponseDTO(
            id=link.location.id,
            label=link.location.label,
            zone=link.location.zone,
            shelf=link.location.shelf,
            level=link.location.level,
            kind=link.kind,
        )
        for link in links
    ]


async def _with_locations(
    products: list[Product], store_id: UUID, location_repo: StoreLocationRepository
) -> list[ProductResponseDTO]:
    """Producto + donde esta en la tienda (visible para dueno y cajeros)."""
    by_product = await location_repo.for_products(store_id, [product.id for product in products])
    return [
        ProductResponseDTO.model_validate(product).model_copy(
            update={"locations": _location_dtos(by_product.get(product.id, []))}
        )
        for product in products
    ]


def _for_viewer(items: list[ProductResponseDTO], user) -> list[ProductResponseDTO]:
    """El costo es solo del dueno: al cajero no se le envia."""
    if user.role == "owner":
        return items
    return [item.model_copy(update={"cost_price": None}) for item in items]


async def _default_alert_days(store_repo: StoreRepository, store_id: UUID) -> int:
    store = await store_repo.get_by_id(store_id)
    return store.default_alert_days if store else DEFAULT_ALERT_DAYS


async def _one_with_locations(
    product: Product, store_id: UUID, location_repo: StoreLocationRepository
) -> ProductResponseDTO:
    return (await _with_locations([product], store_id, location_repo))[0]


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
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
    batch_repo: ProductBatchRepository = Depends(get_product_batch_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    today = None
    if stock == ProductStockFilter.EXPIRING:
        # "Hoy" en la zona horaria de la tienda, igual que las alertas de Inicio.
        store = await store_repo.get_by_id(user.store_id)
        today = local_business_date(store.timezone if store else None)
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
            today=today,
        )
    )
    items = await _with_locations(products, user.store_id, location_repo)
    next_expiry = await batch_repo.next_expiry_for_products(user.store_id, [product.id for product in products])
    return ProductListResponseDTO(
        items=_for_viewer([item.model_copy(update={"next_expiry": next_expiry.get(item.id)}) for item in items], user),
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/pos", response_model=ProductCompactListResponseDTO)
async def list_products_for_pos(
    q: str | None = Query(default=None, min_length=3, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
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
    locations = await location_repo.for_products(user.store_id, [product.id for product in products])
    return ProductCompactListResponseDTO(
        items=[
            ProductCompactResponseDTO(
                id=product.id,
                name=product.name,
                price=product.price,
                stock=product.stock,
                unit=product.unit,
                qr_code=product.qr_code,
                discount_type=product.discount_type,
                discount_value=product.discount_value,
                discount_ends_at=product.discount_ends_at,
                locations=_location_dtos(locations.get(product.id, [])),
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
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    products = await ListLowStockProductsUseCase(repo).execute(user.store_id, limit)
    return _for_viewer(await _with_locations(products, user.store_id, location_repo), user)


@router.get("/qr/{qr_code}", response_model=ProductResponseDTO)
async def get_product_by_qr(
    qr_code: str,
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    product = await GetProductByQRUseCase(repo).execute(user.store_id, qr_code)
    return _for_viewer([await _one_with_locations(product, user.store_id, location_repo)], user)[0]


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


@router.get("/{product_id}/batches", response_model=ProductBatchListResponseDTO)
async def list_product_batches(
    product_id: UUID,
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
    batch_repo: ProductBatchRepository = Depends(get_product_batch_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    batches, untracked = await ListProductBatchesUseCase(batch_repo, repo).execute(user.store_id, product_id)
    store = await store_repo.get_by_id(user.store_id)
    today = local_business_date(store.timezone if store else None)
    return ProductBatchListResponseDTO(
        items=[ProductBatchResponseDTO.from_entity(batch, today) for batch in batches],
        untracked_quantity=untracked,
        today=today,
    )


@router.put("/{product_id}/locations", response_model=list[ProductLocationResponseDTO])
async def set_product_locations(
    product_id: UUID,
    dto: SetProductLocationsDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    links = await SetProductLocationsUseCase(location_repo, repo).execute(
        SetProductLocationsInput(
            store_id=user.store_id,
            product_id=product_id,
            items=[(item.location_id, item.kind) for item in dto.items],
        )
    )
    return _location_dtos(links)


@router.post("", response_model=ProductResponseDTO, status_code=201)
async def create_product(
    dto: CreateProductDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    category_repo: ProductCategoryRepository = Depends(get_product_category_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
    batch_repo: ProductBatchRepository = Depends(get_product_batch_repo),
):
    product = await CreateProductUseCase(repo, category_repo, store_repo, batch_repo).execute(
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
            discount_type=dto.discount_type.value if dto.discount_type else None,
            discount_value=dto.discount_value,
            discount_ends_at=dto.discount_ends_at,
            initial_batch=(
                NewBatch(
                    expires_on=dto.expires_on,
                    alert_days=(
                        dto.alert_days
                        if dto.alert_days is not None
                        else await _default_alert_days(store_repo, user.store_id)
                    ),
                )
                if dto.expires_on
                else None
            ),
        )
    )
    return product


@router.get("/{product_id}", response_model=ProductResponseDTO)
async def get_product(
    product_id: UUID,
    user=Depends(require_active_user),
    repo: ProductRepository = Depends(get_product_repo),
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    product = await GetProductUseCase(repo).execute(user.store_id, product_id)
    return _for_viewer([await _one_with_locations(product, user.store_id, location_repo)], user)[0]


@router.patch("/{product_id}", response_model=ProductResponseDTO)
async def update_product(
    product_id: UUID,
    dto: UpdateProductDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    category_repo: ProductCategoryRepository = Depends(get_product_category_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
):
    product = await UpdateProductUseCase(repo, category_repo, store_repo).execute(
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
            discount_type=dto.discount_type.value if dto.discount_type else None,
            discount_value=dto.discount_value,
            remove_discount=dto.remove_discount,
            discount_ends_at=dto.discount_ends_at,
            clear_discount_ends_at=dto.clear_discount_ends_at,
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
    return await _one_with_locations(product, user.store_id, location_repo)


@router.patch("/{product_id}/stock", response_model=ProductResponseDTO)
async def adjust_stock(
    product_id: UUID,
    dto: StockAdjustmentDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
    location_repo: StoreLocationRepository = Depends(get_store_location_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    new_batch = None
    if dto.expires_on:
        alert_days = dto.alert_days
        if alert_days is None:
            alert_days = await _default_alert_days(store_repo, user.store_id)
        new_batch = NewBatch(expires_on=dto.expires_on, alert_days=alert_days)
    product = await UpdateStockUseCase(repo).execute(
        user.store_id,
        product_id,
        dto.quantity,
        dto.reason,
        new_batch=new_batch,
        batch_id=dto.batch_id,
    )
    return await _one_with_locations(product, user.store_id, location_repo)


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
        # `photo_url` puede venir de un import CSV o de un PATCH con una URL
        # cualquiera (no necesariamente subida por esta tienda) — solo
        # intentamos borrar en Cloudinary si el public_id es realmente uno
        # de los nuestros, para no destruir un asset de otra tienda.
        if old_public_id and old_public_id.startswith(f"products/{user.store_id}/"):
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
    if public_id and public_id.startswith(f"products/{user.store_id}/"):
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
    session: AsyncSession = Depends(get_db_session, scope="function"),
):
    if file.content_type not in {"text/csv", "application/vnd.ms-excel", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Solo se aceptan archivos CSV")

    content = (await file.read()).decode("utf-8", errors="replace")

    product_repo = ProductRepository(session)
    category_repo = ProductCategoryRepository(session)
    job_repo = ImportJobRepository(session)
    batch_repo = ProductBatchRepository(session)
    use_case = ImportProductsCsvUseCase(session, product_repo, category_repo, job_repo, batch_repo)
    default_alert_days = await _default_alert_days(StoreRepository(session), user.store_id)
    job = await use_case.execute(
        user.store_id, user.id, file.filename or "productos.csv", content, default_alert_days=default_alert_days
    )

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
