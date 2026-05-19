from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Inventory API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "local"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "sqlite+aiosqlite:///./inventory_dev.db"

    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_ANON_KEY: str = "local-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "local-service-role-key"

    CLOUDINARY_CLOUD_NAME: str = "local"
    CLOUDINARY_API_KEY: str = "local"
    CLOUDINARY_API_SECRET: str = "local"

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "local-jwt-secret"

    SENTRY_DSN: str | None = None
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8081"
    REQUIRE_REDIS_READY: bool = False
    EXPOSE_ERROR_DETAILS: bool | None = None

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def expose_error_details(self) -> bool:
        return self.DEBUG if self.EXPOSE_ERROR_DETAILS is None else self.EXPOSE_ERROR_DETAILS

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        environment = self.ENVIRONMENT.lower()
        if environment not in {"local", "test", "staging", "production"}:
            raise ValueError("ENVIRONMENT debe ser local, test, staging o production")
        if environment != "production":
            return self

        if self.DEBUG:
            raise ValueError("DEBUG debe ser false en production")
        if self.DATABASE_URL.startswith("sqlite"):
            raise ValueError("DATABASE_URL no puede usar SQLite en production")
        if "*" in self.cors_allowed_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS no puede contener * en production")

        placeholders = {
            self.SUPABASE_URL,
            self.SUPABASE_ANON_KEY,
            self.SUPABASE_SERVICE_ROLE_KEY,
            self.JWT_SECRET,
        }
        if any(value.startswith("local") or value.startswith("your-") or "example" in value for value in placeholders):
            raise ValueError("Production no puede usar secretos placeholder")
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
