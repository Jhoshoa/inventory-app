from abc import ABC, abstractmethod


class IPhotoStorage(ABC):
    @abstractmethod
    async def upload(self, image_bytes: bytes, public_id: str) -> str: ...

    @abstractmethod
    async def delete(self, public_id: str) -> None: ...
