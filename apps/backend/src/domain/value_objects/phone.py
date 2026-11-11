import re

# La app es para tiendas de Bolivia: un numero sin codigo de pais es boliviano.
BOLIVIA_DIAL_CODE = "591"
BOLIVIA_LOCAL_LENGTH = 8

# Solo numeros; se toleran el "+" inicial y los separadores que la gente
# escribe ("+591 700-12345", "(2) 2123456"). Letras u otros simbolos no.
_ALLOWED_RE = re.compile(r"^\+?[0-9\s()-]+$")
# Internacional sin "+": codigo de pais + numero (E.164 admite hasta 15 digitos).
_INTERNATIONAL_RE = re.compile(r"^[1-9][0-9]{9,14}$")
# Fijos (2, 3, 4) y celulares (6, 7) de Bolivia: 8 digitos.
_BOLIVIA_LOCAL_RE = re.compile(r"^[2-7][0-9]{7}$")


def normalize_phone(value: str) -> str:
    """Numero internacional solo con digitos (ej. 59170012345), listo para wa.me.

    Lanza ValueError con un mensaje para mostrar si el numero no es valido.
    """
    raw = value.strip()
    if not raw or not _ALLOWED_RE.match(raw):
        raise ValueError("El telefono solo puede tener numeros")

    digits = re.sub(r"\D", "", raw)
    if not raw.startswith("+"):
        # El 0 inicial es el prefijo de llamada nacional; en formato internacional no va.
        digits = digits.lstrip("0")
        if len(digits) == BOLIVIA_LOCAL_LENGTH:
            digits = BOLIVIA_DIAL_CODE + digits

    if digits.startswith(BOLIVIA_DIAL_CODE):
        if not _BOLIVIA_LOCAL_RE.match(digits[len(BOLIVIA_DIAL_CODE):]):
            raise ValueError("Un numero de Bolivia tiene 8 digitos, ej. 70012345")
        return digits
    if not _INTERNATIONAL_RE.match(digits):
        raise ValueError("Revisa el numero: con el codigo de pais debe tener entre 10 y 15 digitos")
    return digits
