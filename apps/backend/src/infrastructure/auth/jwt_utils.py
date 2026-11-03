import base64
import json


def unverified_claims(token: str) -> dict | None:
    """Lee los claims de un JWT SIN verificar su firma.

    Solo para decisiones que no son de seguridad por si solas (cuanto tiempo
    cachear un token ya validado contra Supabase, o cuan reciente es). Nunca
    usar el resultado para autenticar.
    """
    parts = token.split(".")
    if len(parts) != 3:
        return None
    payload = parts[1]
    try:
        padded = payload + "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except (ValueError, UnicodeError):
        return None
    return data if isinstance(data, dict) else None
