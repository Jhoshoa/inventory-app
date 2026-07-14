import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from sentry_sdk import init as sentry_init

from src.config.settings import settings
from src.presentation.api.health import router as health_router
from src.presentation.api.v1.router import api_v1_router
from src.presentation.middleware.error_handler import add_error_handlers
from src.presentation.middleware.request_context import add_request_context_middleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    if settings.SENTRY_DSN:
        sentry_init(dsn=settings.SENTRY_DSN)

    if settings.DEBUG:
        from src.config.database import AsyncSessionLocal
        from src.infrastructure.database.seed.dev_seed import seed_dev_data

        async with AsyncSessionLocal() as session:
            await seed_dev_data(session)
            await session.commit()
            logger.info("Dev seed data ready")

    yield


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path in openapi_schema["paths"].values():
        for method in path.values():
            if method.get("tags") == ["health"]:
                continue
            method.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    max_form_memory_size=5 * 1024 * 1024,
)

app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_request_context_middleware(app)
add_error_handlers(app)
app.include_router(health_router)
app.include_router(api_v1_router, prefix="/api/v1")
