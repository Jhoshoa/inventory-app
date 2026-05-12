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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
