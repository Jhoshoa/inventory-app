import logging
from typing import Literal

from fastapi import HTTPException
from supabase_auth.errors import AuthApiError, AuthRetryableError

from src.application.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)

AuthAction = Literal["login", "refresh"]


def translate_auth_error(exc: Exception, *, action: AuthAction) -> Exception:
    """Traduce un error de Supabase Auth a una respuesta HTTP coherente.

    Sin esto, cualquier AuthApiError (contrasena incorrecta, refresh token ya
    usado...) llegaba al handler global y salia como 500: el frontend no podia
    distinguir "credenciales/sesion invalidas" de "el servidor se cayo", y cada
    login fallido ensuciaba Sentry.
    """
    if isinstance(exc, AuthRetryableError):
        return HTTPException(
            status_code=503, detail="Servicio de autenticacion no disponible. Intenta nuevamente."
        )

    if isinstance(exc, AuthApiError):
        code = exc.code or ""
        status = exc.status or 0

        if code == "email_not_confirmed":
            return UnauthorizedError(
                "Debes confirmar tu email antes de iniciar sesion. Revisa tu bandeja de entrada."
            )
        if status == 429 or code.startswith("over_"):
            return HTTPException(
                status_code=429, detail="Demasiados intentos. Intenta nuevamente en unos minutos."
            )
        if status >= 500:
            logger.error("Supabase Auth devolvio %s en %s: %s", status, action, exc)
            return HTTPException(
                status_code=503, detail="Servicio de autenticacion no disponible. Intenta nuevamente."
            )
        if action == "refresh":
            return UnauthorizedError("Sesion expirada. Inicia sesion nuevamente.")
        return UnauthorizedError("Credenciales invalidas")

    return exc
