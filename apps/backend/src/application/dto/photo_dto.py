from pydantic import BaseModel


class PhotoUploadResponseDTO(BaseModel):
    filename: str
    size: int
    content_type: str | None
    url: str | None = None


class PhotoOCRResponseDTO(BaseModel):
    status: str
    size: int
    raw_text: str | None = None
    structured: dict | None = None
