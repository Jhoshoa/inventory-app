from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Inventory API"
    DEBUG: bool = False

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

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
