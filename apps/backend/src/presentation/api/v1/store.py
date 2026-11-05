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
    refresh_storefront_tier,
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
            storefront_color_primary=dto.storefront_color_primary,
            storefront_color_secondary=dto.storefront_color_secondary,
            storefront_description=dto.storefront_description,
            storefront_whatsapp=dto.storefront_whatsapp,
            storefront_payment_instructions=dto.storefront_payment_instructions,
        )
    )


_STOREFRONT_IMAGES = {
    # ruta -> (campo de la tienda, public_id en Cloudinary)
    "payment-qr": ("storefront_payment_qr_url", "payment-qr"),
    "storefront-logo": ("storefront_logo_url", "storefront-logo"),
    "storefront-banner": ("storefront_banner_url", "storefront-banner"),
}


async def _read_valid_image(file: UploadFile) -> bytes:
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
    return image_bytes


async def _delete_cloudinary_image(url: str | None, storage: IPhotoStorage) -> None:
    if url and url.startswith("https://res.cloudinary.com/"):
        public_id = parse_public_id_from_url(url)
        if public_id:
            try:
                await storage.delete(public_id)
            except Exception:
                pass


async def _upload_storefront_image(kind, file, user, repo, storage):
    field, name = _STOREFRONT_IMAGES[kind]
    store = await repo.get_by_id(UUID(str(user["store_id"])))
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    image_bytes = await _read_valid_image(file)
    await _delete_cloudinary_image(getattr(store, field), storage)
    setattr(store, field, await storage.upload(image_bytes, f"stores/{store.id}/{name}"))
    refresh_storefront_tier(store)
    return await repo.save(store)


async def _delete_storefront_image(kind, user, repo, storage):
    field, _ = _STOREFRONT_IMAGES[kind]
    store = await repo.get_by_id(UUID(str(user["store_id"])))
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    await _delete_cloudinary_image(getattr(store, field), storage)
    setattr(store, field, None)
    refresh_storefront_tier(store)
    return await repo.save(store)


def _register_storefront_image_routes(kind: str) -> None:
    # Las imagenes del catalogo se suben a Cloudinary: el CSP de la web solo
    # permite imagenes propias y de res.cloudinary.com, una URL externa no se veria.
    async def upload(
        file: UploadFile = File(...),
        user: dict = Depends(get_current_user),
        _owner=Depends(require_owner),
        repo: StoreRepository = Depends(get_store_repo),
        storage: IPhotoStorage = Depends(get_photo_storage),
    ):
        return await _upload_storefront_image(kind, file, user, repo, storage)

    async def delete(
        user: dict = Depends(get_current_user),
        _owner=Depends(require_owner),
        repo: StoreRepository = Depends(get_store_repo),
        storage: IPhotoStorage = Depends(get_photo_storage),
    ):
        return await _delete_storefront_image(kind, user, repo, storage)

    name = kind.replace("-", "_")
    router.add_api_route(
        f"/{kind}", upload, methods=["POST"], response_model=StoreResponseDTO, name=f"upload_{name}"
    )
    router.add_api_route(
        f"/{kind}", delete, methods=["DELETE"], response_model=StoreResponseDTO, name=f"delete_{name}"
    )


for _kind in _STOREFRONT_IMAGES:
    _register_storefront_image_routes(_kind)
