from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.application.exceptions import ApplicationError
from src.config.settings import settings


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _content(request: Request, error: str, detail: str) -> dict:
    return {"error": error, "detail": detail, "request_id": _request_id(request)}


def add_error_handlers(app: FastAPI):
    @app.exception_handler(HTTPException)
    async def http_exception(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_content(request, "http_error", str(exc.detail)),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder(
                {"error": "validation_error", "detail": exc.errors(), "request_id": _request_id(request)}
            ),
        )

    @app.exception_handler(ApplicationError)
    async def application_error(request: Request, exc: ApplicationError):
        content = _content(request, exc.error, exc.detail)
        content.update(exc.extra)
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )

    @app.exception_handler(PermissionError)
    async def permission_error(request: Request, exc: PermissionError):
        return JSONResponse(
            status_code=401,
            content=_content(request, "unauthorized", str(exc)),
        )

    @app.exception_handler(NotImplementedError)
    async def not_implemented(request: Request, exc: NotImplementedError):
        return JSONResponse(
            status_code=501,
            content=_content(request, "not_implemented", str(exc)),
        )

    @app.exception_handler(ValueError)
    async def value_error(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=400,
            content=_content(request, "invalid_data", str(exc)),
        )

    @app.exception_handler(Exception)
    async def global_exception(request: Request, exc: Exception):
        detail = str(exc) if settings.expose_error_details else "Internal server error"
        return JSONResponse(
            status_code=500,
            content=_content(request, "internal_server_error", detail),
        )
