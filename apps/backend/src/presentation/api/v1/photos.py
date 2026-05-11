from fastapi import APIRouter, Depends, UploadFile, File
from src.presentation.dependencies import get_current_user

router = APIRouter(prefix="/photos", tags=["photos"])


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    image_bytes = await file.read()
    return {"filename": file.filename, "size": len(image_bytes)}


@router.post("/ocr")
async def process_photo_ocr(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    image_bytes = await file.read()
    return {"status": "queued", "size": len(image_bytes)}
