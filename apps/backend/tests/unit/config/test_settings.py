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
    FRONTEND_URL="https://app.example.com",
    _env_file=None,
)


_SMTP = dict(
    EMAIL_ENABLED=True,
    SMTP_HOST="smtp-relay.brevo.com",
    SMTP_PORT=587,
    SMTP_USERNAME="login@smtp-brevo.com",
    SMTP_PASSWORD="real-smtp-key",
    SMTP_FROM_EMAIL="noreply@tutiendamiga.digital",
)


def test_email_enabled_needs_a_host_and_a_sender_in_every_environment():
    with pytest.raises(ValueError, match="SMTP_HOST y SMTP_FROM_EMAIL"):
        Settings(EMAIL_ENABLED=True, SMTP_HOST="smtp-relay.brevo.com", _env_file=None)
    with pytest.raises(ValueError, match="SMTP_HOST y SMTP_FROM_EMAIL"):
        Settings(**_PRODUCTION, **{**_SMTP, "SMTP_HOST": " "})


def test_production_accepts_smtp_with_tls_and_also_no_email_at_all():
    Settings(**_PRODUCTION, **_SMTP)
    Settings(**_PRODUCTION, **{**_SMTP, "SMTP_PORT": 465, "SMTP_SECURITY": "ssl"})
    Settings(**_PRODUCTION)


def test_production_rejects_smtp_without_encryption():
    with pytest.raises(ValueError, match="SMTP_SECURITY=none"):
        Settings(**_PRODUCTION, **{**_SMTP, "SMTP_SECURITY": "none"})


def test_local_stack_can_use_mailpit_without_encryption():
    settings = Settings(EMAIL_ENABLED=True, SMTP_HOST="mailpit", SMTP_PORT=1025, SMTP_SECURITY="none", SMTP_FROM_EMAIL="noreply@local.test", _env_file=None)
    assert settings.SMTP_SECURITY == "none"


def test_the_email_logo_comes_from_the_web_unless_overridden():
    assert Settings(FRONTEND_URL="https://app.example.com/", _env_file=None).email_logo_url == "https://app.example.com/email/logo.png"
    assert Settings(EMAIL_LOGO_URL="https://cdn.example.com/logo.png", _env_file=None).email_logo_url == "https://cdn.example.com/logo.png"


def test_unknown_variables_in_the_env_file_do_not_stop_the_app_from_starting(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("SUPABASE_JWT_SECRET=algo-que-el-backend-no-usa\nAPP_NAME=Prueba\n", encoding="utf-8")

    assert Settings(_env_file=str(env_file)).APP_NAME == "Prueba"


def test_production_rejects_a_plain_http_public_url():
    with pytest.raises(ValueError, match="https"):
        Settings(**{**_PRODUCTION, "FRONTEND_URL": "http://app.example.com"})


def test_a_trailing_slash_in_the_public_url_is_removed_so_links_do_not_get_a_double_slash():
    settings = Settings(**{**_PRODUCTION, "FRONTEND_URL": "https://app.example.com/"})

    assert settings.FRONTEND_URL == "https://app.example.com"
    assert f"{settings.FRONTEND_URL}/invite/abc" == "https://app.example.com/invite/abc"


def test_cors_origins_drop_trailing_slashes_because_browsers_never_send_them():
    settings = Settings(**{**_PRODUCTION, "CORS_ALLOWED_ORIGINS": "https://app.example.com/, https://b.example.com"})

    assert settings.cors_allowed_origins == ["https://app.example.com", "https://b.example.com"]
