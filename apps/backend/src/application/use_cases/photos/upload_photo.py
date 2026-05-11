from dataclasses import dataclass
from uuid import UUID
from src.application.ports.photo_storage import IPhotoStorage


@dataclass
class UploadPhotoInput:
    store_id: UUID
    image_bytes: bytes
    filename: str


class UploadPhotoUseCase:
    def __init__(self, storage: IPhotoStorage):
        self._storage = storage

    async def execute(self, input: UploadPhotoInput) -> str:
        url = await self._storage.upload(input.image_bytes, input.filename)
        return url
