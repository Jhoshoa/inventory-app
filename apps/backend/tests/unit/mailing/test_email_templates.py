import re

import pytest

from scripts.build_email_templates import OUTPUT_DIR, rendered_files
from src.infrastructure.services.email.templates import auth_templates, invitation_email


def test_supabase_templates_in_the_repo_are_up_to_date():
    # Si falla: python -m scripts.build_email_templates (y copia los cambios al panel de Supabase).
    if not OUTPUT_DIR.exists():
        pytest.skip("supabase/email-templates no está en esta copia (p. ej. la imagen de Docker)")
    for name, content in rendered_files().items():
        assert (OUTPUT_DIR / name).read_text(encoding="utf-8") == content, name


def test_every_supabase_template_has_its_link_logo_and_a_subject():
    names = {template.name for template in auth_templates()}
    assert names == {"confirmation", "recovery", "magic_link", "email_change"}
    for template in auth_templates():
        # El botón, el enlace de respaldo y su texto visible.
        assert template.html.count("{{ .ConfirmationURL }}") == 3, template.name
        assert 'src="{{ .SiteURL }}/email/logo.png"' in template.html
        assert template.subject
        # Solo variables que Supabase conoce, bien escritas para Go.
        assert set(re.findall(r"\{\{ \.(\w+) \}\}", template.html)) <= {"ConfirmationURL", "SiteURL", "Email", "NewEmail"}
        assert "{{." not in template.html and "{ {" not in template.html


def test_recovery_does_not_promise_how_long_the_link_lasts():
    # D7: el vencimiento real depende de la configuración de Supabase.
    (recovery,) = [t for t in auth_templates() if t.name == "recovery"]
    assert "hora" not in recovery.html


def test_invitation_text_version_has_everything_the_html_has():
    content = invitation_email(
        store_name="Tienda Local",
        invited_by="Rosa",
        role="cashier",
        invite_url="https://x.test/invite/abc",
        expires_in_days=7,
        logo_url="https://x.test/email/logo.png",
        site_url="https://x.test",
    )
    assert content.subject == "Rosa te invitó a Tienda Local"
    for piece in ("Rosa", "Tienda Local", "Cajero", "vence en 7 días", "https://x.test/invite/abc"):
        assert piece in content.text
        assert piece in content.html
    assert "<" not in content.text


def test_auth_uses_these_templates_and_subjects_in_every_environment():
    # docker-compose.yml (producción y stack local) configura Auth con estos archivos.
    compose = OUTPUT_DIR.parents[1] / "docker-compose.yml"
    if not compose.exists():
        pytest.skip("docker-compose.yml no está en esta copia")
    text = compose.read_text(encoding="utf-8")
    for template in auth_templates():
        key = f"GOTRUE_MAILER_SUBJECTS_{template.name.upper()}"
        assert f'{key}: "{template.subject}"' in text, key
        url = f"http://inventory-auth-gateway:8000/email-templates/{template.name}.html"
        assert f"GOTRUE_MAILER_TEMPLATES_{template.name.upper()}: {url}" in text
