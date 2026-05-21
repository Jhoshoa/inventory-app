import re
import easyocr
from PIL import Image
from io import BytesIO
from src.application.ports.ocr_service import IOCRService, OCRResult


class EasyOCRService(IOCRService):
    def __init__(self):
        self.reader = easyocr.Reader(["es"], gpu=False)

    async def extract_from_bytes(self, image_bytes: bytes) -> OCRResult:
        image = Image.open(BytesIO(image_bytes))
        result = self.reader.readtext(image)
        rows = [
            {"text": text, "confidence": conf}
            for _, text, conf in result
            if conf > 0.5
        ]
        raw_text = "\n".join(row["text"] for row in rows)
        structured = {"rows": rows} if rows else None
        return OCRResult(raw_text=raw_text, structured=structured)

    def _structure(self, text: str) -> dict | None:
        text = text.lower().strip()
        price_match = re.search(r"(\d+[.,]?\d*)\s*(?:bs|bob)?", text)
        qty_match = re.findall(r"\d+", text)
        if price_match:
            name = text[: price_match.start()].strip()
            price = float(price_match.group(1).replace(",", "."))
            stock = int(qty_match[-1]) if len(qty_match) > 1 else 0
            return {"name": name.title(), "price": price, "stock": stock}
        return None
