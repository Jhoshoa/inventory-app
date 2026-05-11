from abc import ABC, abstractmethod


class IPhotoStorage(ABC):
    @abstractmethod
    async def upload(self, image_bytes: bytes, filename: str) -> str: ...

    @abstractmethod
    async def delete(self, public_id: str) -> None: ...
