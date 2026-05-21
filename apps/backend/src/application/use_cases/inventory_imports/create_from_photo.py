from dataclasses import dataclass
from uuid import UUID, uuid4

from src.application.ports.ocr_service import IOCRService
from src.application.ports.photo_storage import IPhotoStorage
from src.application.use_cases.inventory_imports.parser import parse_ocr_items
from src.domain.entities.inventory_import import InventoryImport, InventoryImportStatus
from src.domain.repositories.inventory_import_repository import IInventoryImportRepository


@dataclass
class CreateInventoryImportFromPhotoInput:
    store_id: UUID
    user_id: UUID | None
    image_bytes: bytes
    filename: str | None
    content_type: str | None


class CreateInventoryImportFromPhotoUseCase:
    def __init__(
        self,
        repo: IInventoryImportRepository,
        ocr: IOCRService | None = None,
        storage: IPhotoStorage | None = None,
    ):
        self._repo = repo
        self._ocr = ocr
        self._storage = storage

    async def execute(self, input: CreateInventoryImportFromPhotoInput) -> InventoryImport:
        source_photo_url = None
        if self._storage is not None:
            source_photo_url = await self._storage.upload(
                input.image_bytes,
                f"{input.store_id}/{uuid4().hex}",
            )

        import_id = uuid4()
        try:
            if self._ocr is None:
                raw_text = None
                items = []
                status = InventoryImportStatus.FAILED.value
                error_message = (
                    "OCR no esta disponible en el backend. Instala las dependencias AI "
                    "del backend para procesar imagenes."
                )
            else:
                result = await self._ocr.extract_from_bytes(input.image_bytes)
                raw_text = result.raw_text
                structured = result.structured
                items = parse_ocr_items(
                    store_id=input.store_id,
                    import_id=import_id,
                    raw_text=raw_text,
                    structured=structured,
                )
                status = InventoryImportStatus.NEEDS_REVIEW.value
                error_message = None
                if not items:
                    status = InventoryImportStatus.FAILED.value
                    error_message = "OCR no detecto items importables en la imagen."
        except Exception as exc:
            raw_text = None
            items = []
            status = InventoryImportStatus.FAILED.value
            error_message = str(exc)

        inventory_import = InventoryImport(
            id=import_id,
            store_id=input.store_id,
            status=status,
            source_filename=input.filename,
            source_content_type=input.content_type,
            source_photo_url=source_photo_url,
            raw_text=raw_text,
            error_message=error_message,
            items_count=len(items),
            created_by=input.user_id,
            items=items,
        )
        return await self._repo.create(inventory_import)
