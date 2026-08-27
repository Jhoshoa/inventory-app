from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.application.dto.store_dto import StoreResponseDTO, StoreUpdateDTO
from src.application.ports.image_validator import (
    ALLOWED_MIME_TYPES,
    validate_image_magic_bytes,
)
from src.application.ports.photo_storage import IPhotoStorage
from src.application.use_cases.store.get_store import GetStoreUseCase
from src.application.use_cases.store.update_store import (
    UpdateStoreInput,
    UpdateStoreUseCase,
)
from src.config.settings import settings
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.services.cloudinary.photo_storage import (
    parse_public_id_from_url,
)
from src.presentation.dependencies import (
    get_current_user,
    get_photo_storage,
    get_store_repo,
    require_owner,
)

router = APIRouter(prefix="/store", tags=["store"])


@router.get("", response_model=StoreResponseDTO)
async def get_store(
    user: dict = Depends(get_current_user),
    repo: StoreRepository = Depends(get_store_repo),
):
    return await GetStoreUseCase(repo).execute(UUID(str(user["store_id"])))


@router.patch("", response_model=StoreResponseDTO)
async def update_store(
    dto: StoreUpdateDTO,
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    repo: StoreRepository = Depends(get_store_repo),
):
    return await UpdateStoreUseCase(repo).execute(
        UpdateStoreInput(
            store_id=UUID(str(user["store_id"])),
            name=dto.name,
            address=dto.address,
            phone=dto.phone,
            allow_percentage_discount=dto.allow_percentage_discount,
            max_percentage_discount=dto.max_percentage_discount,
            allow_manual_discount=dto.allow_manual_discount,
            max_manual_discount_amount=dto.max_manual_discount_amount,
            allow_cashier_discount_override=dto.allow_cashier_discount_override,
            storefront_enabled=dto.storefront_enabled,
            storefront_slug=dto.storefront_slug,
            storefront_logo_url=dto.storefront_logo_url,
            storefront_banner_url=dto.storefront_banner_url,
            storefront_color_primary=dto.storefront_color_primary,
            storefront_color_secondary=dto.storefront_color_secondary,
            storefront_description=dto.storefront_description,
            storefront_whatsapp=dto.storefront_whatsapp,
            storefront_payment_instructions=dto.storefront_payment_instructions,
        )
    )


@router.post("/payment-qr", response_model=StoreResponseDTO)
async def upload_payment_qr(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    repo: StoreRepository = Depends(get_store_repo),
    storage: IPhotoStorage = Depends(get_photo_storage),
):
    store = await repo.get_by_id(UUID(str(user["store_id"])))
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

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

    if store.storefront_payment_qr_url and store.storefront_payment_qr_url.startswith(
        "https://res.cloudinary.com/"
    ):
        old_public_id = parse_public_id_from_url(store.storefront_payment_qr_url)
        if old_public_id:
            try:
                await storage.delete(old_public_id)
            except Exception:
                pass

    public_id = f"stores/{store.id}/payment-qr"
    store.storefront_payment_qr_url = await storage.upload(image_bytes, public_id)
    return await repo.save(store)


@router.delete("/payment-qr", response_model=StoreResponseDTO)
async def delete_payment_qr(
    user: dict = Depends(get_current_user),
    _owner=Depends(require_owner),
    repo: StoreRepository = Depends(get_store_repo),
    storage: IPhotoStorage = Depends(get_photo_storage),
):
    store = await repo.get_by_id(UUID(str(user["store_id"])))
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    if store.storefront_payment_qr_url and store.storefront_payment_qr_url.startswith(
        "https://res.cloudinary.com/"
    ):
        public_id = parse_public_id_from_url(store.storefront_payment_qr_url)
        if public_id:
            try:
                await storage.delete(public_id)
            except Exception:
                pass

    store.storefront_payment_qr_url = None
    return await repo.save(store)
