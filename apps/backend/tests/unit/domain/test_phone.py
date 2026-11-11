import pytest

from src.domain.value_objects.phone import normalize_phone


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("70012345", "59170012345"),  # sin codigo: Bolivia
        ("070012345", "59170012345"),  # 0 de llamada nacional
        ("22123456", "59122123456"),  # fijo de La Paz
        ("+591 700-12345", "59170012345"),
        ("59170012345", "59170012345"),
        ("(591) 70012345", "59170012345"),
        ("+54 9 11 2345 6789", "5491123456789"),
        ("5491123456789", "5491123456789"),
    ],
)
def test_normalize_phone_returns_international_digits(raw, expected):
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize(
    ("raw", "message"),
    [
        ("7001234a", "solo puede tener numeros"),
        ("70o12345", "solo puede tener numeros"),
        ("", "solo puede tener numeros"),
        ("+591 7001234", "8 digitos"),
        ("591700123456", "8 digitos"),
        ("59190012345", "8 digitos"),  # no empieza con 2-7
        ("1234567", "entre 10 y 15"),
        ("+12345678901234567", "entre 10 y 15"),
    ],
)
def test_normalize_phone_rejects_invalid_numbers(raw, message):
    with pytest.raises(ValueError, match=message):
        normalize_phone(raw)
