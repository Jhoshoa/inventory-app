from decimal import Decimal, InvalidOperation
import re
from uuid import UUID, uuid4

from src.domain.entities.inventory_import import InventoryImportItem, InventoryImportItemStatus

_NUMBER_RE = re.compile(r"^\d+(?:[.,]\d+)?$")


def parse_ocr_items(
    *,
    store_id: UUID,
    import_id: UUID,
    raw_text: str | None,
    structured: dict | None = None,
) -> list[InventoryImportItem]:
    rows = _rows_from_structured(structured) or _rows_from_text(raw_text)
    return [_item_from_row(store_id, import_id, index + 1, row) for index, row in enumerate(rows)]


def _rows_from_structured(structured: dict | None) -> list[dict] | None:
    if not structured:
        return None
    rows = structured.get("items") or structured.get("rows")
    if not isinstance(rows, list) or not rows:
        return None
    return [row for row in rows if isinstance(row, dict)]


def _rows_from_text(raw_text: str | None) -> list[dict]:
    if not raw_text:
        return []
    return [{"text": line.strip()} for line in raw_text.splitlines() if line.strip()]


def _item_from_row(store_id: UUID, import_id: UUID, row_number: int, row: dict) -> InventoryImportItem:
    if "text" not in row:
        return InventoryImportItem(
            id=uuid4(),
            import_id=import_id,
            store_id=store_id,
            row_number=row_number,
            name=str(row.get("name") or "").strip() or f"Item {row_number}",
            category=_string_or_none(row.get("category")),
            sku=_string_or_none(row.get("sku")),
            unit=str(row.get("unit") or "unidad"),
            price=_decimal_or_zero(row.get("price")),
            cost_price=_decimal_or_none(row.get("cost_price")),
            stock=_int_or_zero(row.get("stock")),
            min_stock=_int_or_default(row.get("min_stock"), 5),
            confidence=_decimal_or_none(row.get("confidence")) or Decimal("0.8"),
            raw_data=row,
        )

    tokens = str(row["text"]).split()
    numbers = [token for token in tokens if _NUMBER_RE.match(token)]
    stock = _int_or_zero(numbers[-1]) if numbers else 0
    price = _decimal_or_zero(numbers[-2] if len(numbers) >= 2 else None)
    name_tokens = tokens[:]
    if numbers:
        name_tokens = name_tokens[:-1]
    if len(numbers) >= 2:
        name_tokens = name_tokens[:-1]
    name = " ".join(name_tokens).strip() or str(row["text"]).strip()
    return InventoryImportItem(
        id=uuid4(),
        import_id=import_id,
        store_id=store_id,
        row_number=row_number,
        name=name[:100],
        price=price,
        stock=stock,
        confidence=Decimal("0.6"),
        raw_data=row,
        status=InventoryImportItemStatus.DRAFT.value,
    )


def _decimal_or_zero(value) -> Decimal:
    return _decimal_or_none(value) or Decimal("0")


def _decimal_or_none(value) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None


def _int_or_zero(value) -> int:
    return _int_or_default(value, 0)


def _int_or_default(value, default: int) -> int:
    try:
        return int(Decimal(str(value).replace(",", ".")))
    except (InvalidOperation, ValueError):
        return default


def _string_or_none(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
