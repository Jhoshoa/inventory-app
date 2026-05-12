from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.application.exceptions import ApplicationError


def add_error_handlers(app: FastAPI):
    @app.exception_handler(ApplicationError)
    async def application_error(request: Request, exc: ApplicationError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error, "detail": exc.detail},
        )

    @app.exception_handler(PermissionError)
    async def permission_error(request: Request, exc: PermissionError):
        return JSONResponse(
            status_code=401,
            content={"error": "unauthorized", "detail": str(exc)},
        )

    @app.exception_handler(NotImplementedError)
    async def not_implemented(request: Request, exc: NotImplementedError):
        return JSONResponse(
            status_code=501,
            content={"error": "not_implemented", "detail": str(exc)},
        )

    @app.exception_handler(ValueError)
    async def value_error(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=400,
            content={"error": "invalid_data", "detail": str(exc)},
        )

    @app.exception_handler(Exception)
    async def global_exception(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"error": "internal_server_error", "detail": str(exc)},
        )
