"""Genera las plantillas de Supabase Auth (confirmar cuenta, recuperar contraseña...)
con el mismo diseño que los correos de la API (src/infrastructure/services/email/templates.py).

    python -m scripts.build_email_templates

Escribe supabase/email-templates/ en la raíz del repo: el stack local las sirve a
Supabase Auth y en producción se copian al panel de Supabase (ver el README de esa carpeta).
Un test falla si quedan desactualizadas.
"""

import json
from pathlib import Path

from src.infrastructure.services.email.templates import auth_templates

OUTPUT_DIR = Path(__file__).resolve().parents[3] / "supabase" / "email-templates"


def rendered_files() -> dict[str, str]:
    templates = auth_templates()
    files = {f"{template.name}.html": template.html for template in templates}
    files["subjects.json"] = json.dumps({t.name: t.subject for t in templates}, ensure_ascii=False, indent=2) + "\n"
    return files


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, content in rendered_files().items():
        (OUTPUT_DIR / name).write_text(content, encoding="utf-8", newline="\n")
        print(f"Wrote {OUTPUT_DIR / name}")


if __name__ == "__main__":
    main()
