from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def add_error_handlers(app: FastAPI):
    @app.exception_handler(Exception)
    async def global_exception(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"error": "Error interno del servidor", "detail": str(exc)},
        )

    @app.exception_handler(ValueError)
    async def value_error(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=400,
            content={"error": "Datos inválidos", "detail": str(exc)},
        )
