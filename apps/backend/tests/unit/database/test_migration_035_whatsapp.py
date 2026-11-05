import importlib.util
from pathlib import Path

import pytest

_MIGRATION = (
    Path(__file__).resolve().parents[3]
    / "src/infrastructure/database/alembic/versions/035_storefront_whatsapp_international.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("migration_035", _MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("70000000", "59170000000"),
        ("700-00 000", "59170000000"),
        ("+591 70000000", "59170000000"),
        ("5491123456789", "5491123456789"),
        ("", None),
        ("abc", None),
    ],
)
def test_normalize_whatsapp(raw, expected):
    assert _load_migration().normalize_whatsapp(raw) == expected
