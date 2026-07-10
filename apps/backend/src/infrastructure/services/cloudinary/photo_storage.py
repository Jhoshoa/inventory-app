import re
from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader

from src.application.ports.photo_storage import IPhotoStorage
from src.config.settings import settings

_CLOUDINARY_URL_PATTERN = re.compile(
    r"https?://res\.cloudinary\.com/[^/]+/image/upload/(?:v\d+/)?(.+)\.\w+$"
)


def parse_public_id_from_url(url: str) -> str | None:
    match = _CLOUDINARY_URL_PATTERN.match(url)
    if match:
        return match.group(1)
    path = urlparse(url).path
    if "/upload/" in path:
        parts = path.split("/upload/")[1]
        parts = re.sub(r"^v\d+/", "", parts)
        parts = re.sub(r"\.\w+$", "", parts)
        return parts
    return None


class CloudinaryPhotoStorage(IPhotoStorage):
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )

    async def upload(self, image_bytes: bytes, public_id: str) -> str:
        result = cloudinary.uploader.upload(
            image_bytes,
            public_id=public_id,
            resource_type="image",
            quality="auto:good",
            width=800,
            fetch_format="auto",
        )
        return result["secure_url"]

    async def delete(self, public_id: str) -> None:
        cloudinary.uploader.destroy(public_id)
