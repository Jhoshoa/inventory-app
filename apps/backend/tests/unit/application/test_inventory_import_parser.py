from decimal import Decimal
from uuid import uuid4

from src.application.use_cases.inventory_imports.parser import parse_ocr_items


def test_parser_converts_simple_lines_to_drafts():
    store_id = uuid4()
    import_id = uuid4()

    items = parse_ocr_items(
        store_id=store_id,
        import_id=import_id,
        raw_text="Arroz 1kg 12.50 20\nAceite 1l 18 5",
    )

    assert len(items) == 2
    assert items[0].name == "Arroz 1kg"
    assert items[0].price == Decimal("12.50")
    assert items[0].stock == 20
    assert items[0].confidence == Decimal("0.6")
    assert items[1].name == "Aceite 1l"


def test_parser_handles_empty_or_ambiguous_lines():
    store_id = uuid4()
    import_id = uuid4()

    items = parse_ocr_items(store_id=store_id, import_id=import_id, raw_text="\nProducto sin numeros\n")

    assert len(items) == 1
    assert items[0].name == "Producto sin numeros"
    assert items[0].price == Decimal("0")
    assert items[0].stock == 0
