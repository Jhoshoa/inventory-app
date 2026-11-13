from typing import Literal

from pydantic import field_validator, model_validator
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
    # Auth corre en el mismo servidor: la API lo usa por la red interna (SUPABASE_URL)
    # y el navegador por la URL publica (APP_URL/auth/v1/...). Vacio = SUPABASE_URL.
    SUPABASE_PUBLIC_URL: str = ""
    # "Continuar con Google": requiere el proveedor activo en Auth (GOOGLE_CLIENT_ID...).
    AUTH_GOOGLE_ENABLED: bool = False

    CLOUDINARY_CLOUD_NAME: str = "local"
    CLOUDINARY_API_KEY: str = "local"
    CLOUDINARY_API_SECRET: str = "local"

    JWT_SECRET: str = "local-jwt-secret"

    TRIAL_DAYS: int = 30
    TRIAL_WARN_DAYS: int = 5
    GRACE_PERIOD_DAYS: int = 15
    PURCHASE_URL: str = "https://tusitio.com/planes"

    # Cron interno (APScheduler) que expira trials y periodos de gracia vencidos.
    # En despliegues con varios workers (ver WORKERS), dejar esto en true solo en
    # UN worker/proceso para evitar ejecuciones duplicadas del mismo dia.
    ENABLE_SCHEDULER: bool = True

    # Correo transaccional (invitaciones) por SMTP: sirve cualquier proveedor
    # (Brevo, SES, Mailgun...) y Mailpit en el stack local. Con EMAIL_ENABLED=false
    # no se envia nada: la invitacion se registra en el log y la API devuelve el
    # enlace para que el dueno lo comparta. SMTP_FROM_EMAIL debe ser un remitente
    # de un dominio autenticado en el proveedor (SPF/DKIM), si no cae en spam.
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    # starttls (puerto 587), ssl (puerto 465) o none (solo Mailpit, sin cifrar).
    SMTP_SECURITY: Literal["starttls", "ssl", "none"] = "starttls"
    SMTP_TIMEOUT_SECONDS: float = 10.0
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Tu Tiendamiga"
    # Logo de los correos: PNG publico (los clientes de correo no muestran SVG).
    # Vacio: {FRONTEND_URL}/email/logo.png, que sirve la web.
    EMAIL_LOGO_URL: str = ""

    SENTRY_DSN: str | None = None
    FRONTEND_URL: str = "http://localhost:3010"
    INVITATION_EXPIRE_DAYS: int = 7

    # Rate limiting (en memoria, por proceso — ver src/infrastructure/services/rate_limit)
    RATE_LIMIT_LOGIN_MAX: int = 10
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_GLOBAL_MAX: int = 300
    RATE_LIMIT_GLOBAL_WINDOW_SECONDS: int = 60

    # Ciclo de vida de tiendas suspendidas (ver ArchiveStoresUseCase)
    STORE_ARCHIVE_AFTER_SUSPENDED_DAYS: int = 90
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3010,http://localhost:8081"
    MAX_IMAGE_SIZE_MB: int = 5

    @property
    def MAX_IMAGE_SIZE_BYTES(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    EXPOSE_ERROR_DETAILS: bool | None = None

    @field_validator("FRONTEND_URL")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        # Se concatena como f"{FRONTEND_URL}/invite/...": una barra final daria "//".
        return value.strip().rstrip("/")

    @property
    def cors_allowed_origins(self) -> list[str]:
        # El header Origin del navegador nunca lleva barra final, asi que un origen
        # configurado con ella no coincidiria jamas.
        return [origin.strip().rstrip("/") for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def supabase_public_url(self) -> str:
        return (self.SUPABASE_PUBLIC_URL.strip() or self.SUPABASE_URL).rstrip("/")

    @property
    def email_logo_url(self) -> str:
        return self.EMAIL_LOGO_URL.strip() or f"{self.FRONTEND_URL}/email/logo.png"

    @property
    def expose_error_details(self) -> bool:
        return self.DEBUG if self.EXPOSE_ERROR_DETAILS is None else self.EXPOSE_ERROR_DETAILS

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        environment = self.ENVIRONMENT.lower()
        if environment not in {"local", "test", "staging", "production"}:
            raise ValueError("ENVIRONMENT debe ser local, test, staging o production")
        if self.EMAIL_ENABLED and not (self.SMTP_HOST.strip() and self.SMTP_FROM_EMAIL.strip()):
            raise ValueError("Con EMAIL_ENABLED=true hacen falta SMTP_HOST y SMTP_FROM_EMAIL")
        if environment != "production":
            return self

        if self.DEBUG:
            raise ValueError("DEBUG debe ser false en production")
        if self.DATABASE_URL.startswith("sqlite"):
            raise ValueError("DATABASE_URL no puede usar SQLite en production")
        if "*" in self.cors_allowed_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS no puede contener * en production")

        if not self.FRONTEND_URL.startswith("https://"):
            raise ValueError(
                "FRONTEND_URL (APP_URL) debe usar https:// en production: las cookies de sesion son "
                "Secure y el navegador no las guarda sobre http, asi que el login no se mantendria"
            )

        if self.AUTH_GOOGLE_ENABLED and not self.supabase_public_url.startswith("https://"):
            raise ValueError(
                "SUPABASE_PUBLIC_URL (APP_URL) debe usar https:// en production: el navegador "
                "abre esa URL para entrar con Google"
            )
        if self.EMAIL_ENABLED and self.SMTP_SECURITY == "none":
            raise ValueError("SMTP_SECURITY=none solo sirve para Mailpit: en production usa starttls o ssl")

        placeholders = {
            self.SUPABASE_URL,
            self.SUPABASE_ANON_KEY,
            self.SUPABASE_SERVICE_ROLE_KEY,
            self.JWT_SECRET,
        }
        if any(
            value.startswith(("local", "your-", "replace-with")) or "example" in value for value in placeholders
        ):
            raise ValueError("Production no puede usar secretos placeholder")
        return self

    # extra="ignore": un .env con variables que esta clase no declara (por ejemplo
    # SUPABASE_JWT_SECRET, que el backend no usa) no debe impedir que arranque.
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
