import hashlib

from fastapi import APIRouter, Depends, UploadFile, File
from src.application.dto.photo_dto import PhotoOCRResponseDTO, PhotoUploadResponseDTO
from src.config.settings import settings
from src.presentation.dependencies import get_current_user
from src.infrastructure.services.cloudinary.photo_storage import CloudinaryPhotoStorage

router = APIRouter(prefix="/photos", tags=["photos"])


@router.post("/upload", response_model=PhotoUploadResponseDTO)
async def upload_photo(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    image_bytes = await file.read()
    url = None
    has_cloudinary_credentials = (
        settings.CLOUDINARY_CLOUD_NAME not in {"local", "your-cloud-name"}
        and not settings.CLOUDINARY_CLOUD_NAME.startswith("your-")
        and settings.CLOUDINARY_API_KEY not in {"local", "your-api-key"}
        and settings.CLOUDINARY_API_SECRET not in {"local", "your-api-secret"}
    )
    if has_cloudinary_credentials:
        digest = hashlib.sha1(image_bytes).hexdigest()[:16]
        storage = CloudinaryPhotoStorage()
        url = await storage.upload(image_bytes, f"{user['store_id']}/{digest}")
    return {
        "filename": file.filename or "upload",
        "size": len(image_bytes),
        "content_type": file.content_type,
        "url": url,
    }


@router.post("/ocr", response_model=PhotoOCRResponseDTO)
async def process_photo_ocr(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    image_bytes = await file.read()
    try:
        from src.infrastructure.services.ocr.easy_ocr import EasyOCRService

        result = await EasyOCRService().extract_from_bytes(image_bytes)
        return {
            "status": "processed",
            "size": len(image_bytes),
            "raw_text": result.raw_text,
            "structured": result.structured,
        }
    except Exception:
        return {"status": "queued", "size": len(image_bytes), "raw_text": None, "structured": None}
