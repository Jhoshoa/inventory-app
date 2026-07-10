ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

_JPEG_HEADER = b"\xff\xd8\xff"
_PNG_HEADER = b"\x89PNG\r\n\x1a\n"
_WEBP_HEADER_START = b"RIFF"
_WEBP_HEADER_END = b"WEBP"


def validate_image_magic_bytes(data: bytes) -> bool:
    if len(data) < 12:
        return False
    if data[:3] == _JPEG_HEADER:
        return True
    if data[:8] == _PNG_HEADER:
        return True
    if data[:4] == _WEBP_HEADER_START and data[8:12] == _WEBP_HEADER_END:
        return True
    return False
