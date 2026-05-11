from dataclasses import dataclass
from src.application.ports.ocr_service import IOCRService, OCRResult


@dataclass
class ProcessPhotoOCRInput:
    image_bytes: bytes


class ProcessPhotoOCRUsecase:
    def __init__(self, ocr: IOCRService):
        self._ocr = ocr

    async def execute(self, input: ProcessPhotoOCRInput) -> OCRResult:
        return await self._ocr.extract_from_bytes(input.image_bytes)
