import logging
import time

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from supabase_auth.errors import AuthApiError, AuthError, AuthRetryableError, AuthWeakPasswordError

from src.application.dto.auth_dto import ForgotPasswordDTO, MessageResponseDTO, ResetPasswordDTO
from src.application.exceptions import ApplicationError, UnauthorizedError
from src.config.settings import settings
from src.infrastructure.auth.jwt_utils import unverified_claims
from src.infrastructure.auth.supabase_client import get_supabase_admin_client, get_supabase_client
from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    password_reset_rate_limiter,
)
from src.presentation.api.v1.auth import _client_ip

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# El access token de recuperacion nace cuando el usuario hace clic en el enlace
# del correo. Una sesion mas vieja que esto no es "venir del enlace": es un
# token de login normal, y no debe poder cambiar la contrasena por esta via.
_RESET_TOKEN_MAX_AGE_SECONDS = 15 * 60

_RATE_LIMITED_DETAIL = "Demasiados intentos. Intenta nuevamente en unos minutos."
_INVALID_LINK_DETAIL = "El enlace expiro o no es valido. Solicita uno nuevo."
_UNAVAILABLE_DETAIL = "Servicio de autenticacion no disponible. Intenta nuevamente."


class PasswordChangeRejectedError(ApplicationError):
    status_code = 400
    error = "password_rejected"


@router.post("/forgot-password", response_model=MessageResponseDTO)
async def forgot_password(dto: ForgotPasswordDTO, request: Request):
    if not password_reset_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail=_RATE_LIMITED_DETAIL)

    # Misma respuesta exista o no el correo: no se puede usar este endpoint
    # para averiguar quien tiene cuenta.
    generic = MessageResponseDTO(
        message="Si el correo tiene una cuenta, te enviamos un enlace para restablecer tu contrasena."
    )

    if settings.DEBUG:
        logger.info("forgot-password (DEBUG): no se envia correo en modo desarrollo")
        return generic

    supabase = get_supabase_client()
    try:
        await run_in_threadpool(
            supabase.auth.reset_password_for_email,
            dto.email,
            {"redirect_to": f"{settings.FRONTEND_URL}/reset-password"},
        )
    except AuthRetryableError as exc:
        raise HTTPException(status_code=503, detail=_UNAVAILABLE_DETAIL) from exc
    except AuthApiError:
        # Por ejemplo el limite por usuario de Supabase (un correo por minuto):
        # responder distinto revelaria que la cuenta existe.
        logger.warning("forgot-password: Supabase rechazo la solicitud", exc_info=True)
    return generic


@router.post("/reset-password", response_model=MessageResponseDTO)
async def reset_password(dto: ResetPasswordDTO, request: Request):
    if not password_reset_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail=_RATE_LIMITED_DETAIL)

    if settings.DEBUG:
        raise HTTPException(
            status_code=400,
            detail="El restablecimiento de contrasena requiere Supabase (DEBUG=false).",
        )

    claims = unverified_claims(dto.access_token)
    issued_at = claims.get("iat") if claims else None
    if not isinstance(issued_at, (int, float)) or time.time() - issued_at > _RESET_TOKEN_MAX_AGE_SECONDS:
        raise UnauthorizedError(_INVALID_LINK_DETAIL)

    admin = get_supabase_admin_client()
    try:
        user_response = await run_in_threadpool(admin.auth.get_user, dto.access_token)
    except AuthRetryableError as exc:
        raise HTTPException(status_code=503, detail=_UNAVAILABLE_DETAIL) from exc
    except AuthError as exc:
        raise UnauthorizedError(_INVALID_LINK_DETAIL) from exc

    user = user_response.user if user_response else None
    if user is None:
        raise UnauthorizedError(_INVALID_LINK_DETAIL)

    # Supabase cierra todas las sesiones del usuario al cambiar su contrasena
    # (incluida la de este token de recuperacion, asi que el enlace no se puede
    # reutilizar). No hace falta cerrarlas por separado.
    try:
        await run_in_threadpool(
            admin.auth.admin.update_user_by_id, str(user.id), {"password": dto.password}
        )
    except AuthRetryableError as exc:
        raise HTTPException(status_code=503, detail=_UNAVAILABLE_DETAIL) from exc
    except AuthWeakPasswordError as exc:
        raise PasswordChangeRejectedError(
            "La contrasena no cumple la politica de seguridad. Elige una mas segura."
        ) from exc
    except AuthError as exc:
        logger.warning("reset-password: Supabase rechazo el cambio de contrasena", exc_info=True)
        raise PasswordChangeRejectedError(
            "No se pudo actualizar la contrasena. Solicita un enlace nuevo."
        ) from exc

    return MessageResponseDTO(message="Contrasena actualizada. Ya puedes iniciar sesion.")
