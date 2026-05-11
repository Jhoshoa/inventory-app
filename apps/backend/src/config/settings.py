from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Inventory API"
    DEBUG: bool = False

    DATABASE_URL: str

    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str

    SENTRY_DSN: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
