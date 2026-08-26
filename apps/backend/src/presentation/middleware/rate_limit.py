from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    global_rate_limiter,
)

_EXCLUDED_PATH_PREFIXES = ("/health",)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def add_rate_limit_middleware(app: FastAPI) -> None:
    """Red de seguridad generosa por IP sobre toda la API.

    No reemplaza los limites especificos y mas estrictos de endpoints
    sensibles (login, invitaciones, leads publicos) — esos ya se validan en
    cada router. Este middleware solo evita que un cliente o bot agote el
    servicio para todos con un volumen anormal de requests.
    """

    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        if request.url.path.startswith(_EXCLUDED_PATH_PREFIXES):
            return await call_next(request)

        if not global_rate_limiter.is_allowed(_client_ip(request)):
            return JSONResponse(
                status_code=429,
                content={"error": "rate_limited", "detail": "Demasiadas solicitudes. Intenta nuevamente en unos minutos."},
            )

        return await call_next(request)
