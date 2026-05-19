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
