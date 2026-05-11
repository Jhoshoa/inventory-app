from abc import ABC, abstractmethod
from pydantic import BaseModel


class OCRResult(BaseModel):
    raw_text: str
    structured: dict | None = None


class IOCRService(ABC):
    @abstractmethod
    async def extract_from_bytes(self, image_bytes: bytes) -> OCRResult: ...
