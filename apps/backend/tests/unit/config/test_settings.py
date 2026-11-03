import pytest

from src.config.settings import Settings


def test_production_rejects_debug_true():
    with pytest.raises(ValueError, match="DEBUG"):
        Settings(
            ENVIRONMENT="production",
            DEBUG=True,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost/db",
            CORS_ALLOWED_ORIGINS="https://app.example.com",
            SUPABASE_URL="https://real.supabase.co",
            SUPABASE_ANON_KEY="real-anon",
            SUPABASE_SERVICE_ROLE_KEY="real-service",
            JWT_SECRET="real-secret",
            _env_file=None,
        )


def test_production_rejects_sqlite_database():
    with pytest.raises(ValueError, match="SQLite"):
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            DATABASE_URL="sqlite+aiosqlite:///./inventory.db",
            CORS_ALLOWED_ORIGINS="https://app.example.com",
            SUPABASE_URL="https://real.supabase.co",
            SUPABASE_ANON_KEY="real-anon",
            SUPABASE_SERVICE_ROLE_KEY="real-service",
            JWT_SECRET="real-secret",
            _env_file=None,
        )


def test_production_rejects_wildcard_cors():
    with pytest.raises(ValueError, match="CORS"):
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost/db",
            CORS_ALLOWED_ORIGINS="*",
            SUPABASE_URL="https://real.supabase.co",
            SUPABASE_ANON_KEY="real-anon",
            SUPABASE_SERVICE_ROLE_KEY="real-service",
            JWT_SECRET="real-secret",
            _env_file=None,
        )


_PRODUCTION = dict(
    ENVIRONMENT="production",
    DEBUG=False,
    DATABASE_URL="postgresql+asyncpg://user:pass@localhost/db",
    CORS_ALLOWED_ORIGINS="https://app.example.com",
    SUPABASE_URL="https://real.supabase.co",
    SUPABASE_ANON_KEY="real-anon",
    SUPABASE_SERVICE_ROLE_KEY="real-service",
    JWT_SECRET="real-secret",
    _env_file=None,
)


def test_production_requires_a_sender_address_when_brevo_is_configured():
    with pytest.raises(ValueError, match="EMAIL_FROM_ADDRESS"):
        Settings(**_PRODUCTION, BREVO_API_KEY="xkeysib-real")


def test_production_accepts_brevo_with_a_sender_address_and_also_no_brevo_at_all():
    Settings(**_PRODUCTION, BREVO_API_KEY="xkeysib-real", EMAIL_FROM_ADDRESS="no-responder@ecobriefbolivia.online")
    Settings(**_PRODUCTION)


def test_unknown_variables_in_the_env_file_do_not_stop_the_app_from_starting(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("SUPABASE_JWT_SECRET=algo-que-el-backend-no-usa\nAPP_NAME=Prueba\n", encoding="utf-8")

    assert Settings(_env_file=str(env_file)).APP_NAME == "Prueba"
