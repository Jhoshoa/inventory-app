from celery import shared_task


@shared_task(bind=True, max_retries=3, acks_late=True)
def process_photo_ocr(self, photo_id: str, image_bytes: bytes):
    try:
        from src.infrastructure.services.ocr.easy_ocr import EasyOCRService
        ocr = EasyOCRService()
        result = ocr.extract_from_bytes(image_bytes)
        return result.model_dump()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
