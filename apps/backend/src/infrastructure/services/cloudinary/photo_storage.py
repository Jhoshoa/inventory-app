import cloudinary
import cloudinary.uploader
from src.config.settings import settings
from src.application.ports.photo_storage import IPhotoStorage


class CloudinaryPhotoStorage(IPhotoStorage):
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )

    async def upload(self, image_bytes: bytes, filename: str) -> str:
        result = cloudinary.uploader.upload(
            image_bytes,
            public_id=f"products/{filename}",
            resource_type="image",
            quality="auto:good",
            width=800,
            fetch_format="auto",
        )
        return result["secure_url"]

    async def delete(self, public_id: str) -> None:
        cloudinary.uploader.destroy(public_id)
