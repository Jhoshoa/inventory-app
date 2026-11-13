"""Correos con la marca: un mismo diseño para la invitación (la envía la API) y para
los correos de Supabase Auth (confirmar cuenta, recuperar contraseña...), que se
generan como plantillas con las variables de Go de Supabase
(`python -m scripts.build_email_templates`).

HTML pensado para clientes de correo: tablas, estilos en línea, ancho máximo 560 px,
botón que funciona sin imágenes y siempre una versión en texto.
"""

import re
from dataclasses import dataclass
from html import escape

BRAND_NAME = "Tu Tiendamiga"
TAGLINE = "Vende, controla tu stock y cierra caja desde el celular."

# Colores de la web (brand-700, texto y fondos del panel).
_BRAND = "#1F4FD8"
_INK = "#101828"
_BODY = "#344054"
_MUTED = "#667085"
_PAGE = "#F2F4F7"
_LINE = "#EAECF0"
_SOFT = "#F5F8FF"
_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

ROLE_LABELS = {"owner": "Dueño", "cashier": "Cajero"}
ROLE_DETAILS = {
    "owner": "Podrás manejar todo: productos, ventas, caja, reportes, configuración y personas.",
    "cashier": "Podrás vender y ver los productos, las ventas y los pedidos de la tienda.",
}

_CONTROL_CHARS = re.compile(r"[\r\n\t\x00-\x1f]+")


@dataclass(frozen=True)
class EmailContent:
    subject: str
    html: str
    text: str


def one_line(value: str) -> str:
    """Nombres que escribe un usuario, sin saltos de línea (van al asunto)."""
    return _CONTROL_CHARS.sub(" ", value).strip()


def _plural_days(days: int) -> str:
    return "1 día" if days == 1 else f"{days} días"


def render_layout(
    *,
    preheader: str,
    title: str,
    intro_html: str,
    button_label: str,
    button_url: str,
    note_html: str,
    logo_url: str,
    site_url: str,
    brand_name: str = BRAND_NAME,
    details_html: str = "",
) -> str:
    """El esqueleto de todos los correos. `intro_html`, `details_html` y `note_html`
    llegan ya escapados; el resto se escapa aquí. Las variables de Go de Supabase
    ({{ .ConfirmationURL }}) no tienen caracteres que escapar y pasan tal cual."""
    brand = escape(brand_name)
    url = escape(button_url, quote=True)
    details = (
        f'<tr><td class="px" style="padding:0 32px 24px 32px;">'
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        f'bgcolor="{_SOFT}" style="background:{_SOFT};border-radius:12px;"><tr><td style="padding:16px 18px;font-family:{_FONT};'
        f'font-size:14px;line-height:21px;color:{_BODY};">{details_html}</td></tr></table></td></tr>'
        if details_html
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{escape(title)}</title>
<style>
  @media (max-width:600px) {{
    .container {{ width:100% !important; }}
    .px {{ padding-left:20px !important; padding-right:20px !important; }}
    .button table {{ width:100% !important; }}
    .button a {{ display:block !important; }}
  }}
</style>
</head>
<body bgcolor="{_PAGE}" style="margin:0;padding:0;background:{_PAGE};-webkit-text-size-adjust:100%;">
<div style="display:none;mso-hide:all;max-height:0;overflow:hidden;opacity:0;color:transparent;">{escape(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="{_PAGE}" style="background:{_PAGE};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;">
<tr><td align="center" style="padding:0 0 20px 0;">
<a href="{escape(site_url, quote=True)}" target="_blank" style="text-decoration:none;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="padding-right:10px;vertical-align:middle;"><img src="{escape(logo_url, quote=True)}" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px;"></td>
<td style="vertical-align:middle;font-family:{_FONT};font-size:20px;font-weight:800;color:{_INK};letter-spacing:-0.2px;">{brand}</td>
</tr></table>
</a>
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid {_LINE};border-radius:16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td class="px" style="padding:32px 32px 8px 32px;font-family:{_FONT};font-size:24px;line-height:30px;font-weight:800;color:{_INK};">{escape(title)}</td></tr>
<tr><td class="px" style="padding:8px 32px 24px 32px;font-family:{_FONT};font-size:16px;line-height:24px;color:{_BODY};">{intro_html}</td></tr>
{details}<tr><td class="px button" style="padding:0 32px 24px 32px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td align="center" bgcolor="{_BRAND}" style="border-radius:10px;background:{_BRAND};">
<a href="{url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:{_FONT};font-size:16px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">{escape(button_label)}</a>
</td></tr></table>
</td></tr>
<tr><td class="px" style="padding:0 32px 24px 32px;font-family:{_FONT};font-size:14px;line-height:21px;color:{_MUTED};">{note_html}</td></tr>
<tr><td class="px" style="padding:20px 32px 28px 32px;border-top:1px solid {_LINE};font-family:{_FONT};font-size:13px;line-height:19px;color:{_MUTED};">
¿El botón no funciona? Copia este enlace en tu navegador:<br>
<a href="{url}" target="_blank" style="color:{_BRAND};word-break:break-all;">{escape(button_url)}</a>
</td></tr>
</table>
</td></tr>
<tr><td align="center" class="px" style="padding:20px 24px 0 24px;font-family:{_FONT};font-size:12px;line-height:18px;color:{_MUTED};">
<strong style="color:{_BODY};">{brand}</strong> · {escape(TAGLINE)}<br>
Este es un correo automático: no hace falta responderlo.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def render_text(*, title: str, paragraphs: list[str], button_label: str, button_url: str, brand_name: str = BRAND_NAME) -> str:
    body = "\n\n".join(paragraphs)
    return f"{title}\n\n{body}\n\n{button_label}: {button_url}\n\n--\n{brand_name} · {TAGLINE}\n"


def invitation_email(
    *,
    store_name: str,
    invited_by: str,
    role: str,
    invite_url: str,
    expires_in_days: int,
    logo_url: str,
    site_url: str,
    brand_name: str = BRAND_NAME,
) -> EmailContent:
    store = one_line(store_name) or "tu tienda"
    inviter = one_line(invited_by) or "Alguien"
    role_label = ROLE_LABELS.get(role, ROLE_LABELS["cashier"])
    role_detail = ROLE_DETAILS.get(role, ROLE_DETAILS["cashier"])
    days = _plural_days(expires_in_days)

    title = f"Te invitaron a {store}"
    intro = (
        f"<strong>{escape(inviter)}</strong> te invitó a unirte a <strong>{escape(store)}</strong> "
        f"como <strong>{escape(role_label)}</strong> en {escape(brand_name)}."
    )
    details = f'<strong style="color:{_INK};">Como {escape(role_label)}</strong><br>{escape(role_detail)}'
    note = (
        f"La invitación vence en {days}. Si no esperabas este correo, puedes ignorarlo: "
        "no se creará ninguna cuenta."
    )
    html = render_layout(
        preheader=f"Únete como {role_label}. La invitación vence en {days}.",
        title=title,
        intro_html=intro,
        details_html=details,
        button_label="Aceptar invitación",
        button_url=invite_url,
        note_html=escape(note),
        logo_url=logo_url,
        site_url=site_url,
        brand_name=brand_name,
    )
    text = render_text(
        title=title,
        paragraphs=[
            f"{inviter} te invitó a unirte a {store} como {role_label} en {brand_name}.",
            f"Como {role_label}: {role_detail}",
            note,
        ],
        button_label="Aceptar invitación",
        button_url=invite_url,
        brand_name=brand_name,
    )
    return EmailContent(subject=f"{inviter} te invitó a {store}", html=html, text=text)


# --- Supabase Auth -----------------------------------------------------------
# Supabase llena estas plantillas con Go: {{ .ConfirmationURL }}, {{ .Email }},
# {{ .NewEmail }} y {{ .SiteURL }} (la URL de la web, APP_URL).


@dataclass(frozen=True)
class AuthTemplate:
    name: str
    subject: str
    html: str


def auth_templates(brand_name: str = BRAND_NAME) -> list[AuthTemplate]:
    logo = "{{ .SiteURL }}/email/logo.png"
    site = "{{ .SiteURL }}"
    link = "{{ .ConfirmationURL }}"
    brand = escape(brand_name)

    def make(name: str, subject: str, **parts: str) -> AuthTemplate:
        return AuthTemplate(
            name=name,
            subject=subject,
            html=render_layout(logo_url=logo, site_url=site, button_url=link, brand_name=brand_name, **parts),
        )

    return [
        make(
            "confirmation",
            f"Confirma tu correo en {brand_name}",
            preheader="Un clic y tu tienda queda lista para empezar.",
            title="Confirma tu correo",
            intro_html=(
                f"Te damos la bienvenida a {brand}. Confirma que <strong>{{{{ .Email }}}}</strong> es tu correo "
                "para empezar a usar tu tienda."
            ),
            button_label="Confirmar mi correo",
            note_html=f"Si no creaste una cuenta en {brand}, ignora este correo.",
        ),
        make(
            "recovery",
            "Crea tu nueva contraseña",
            preheader="Usa este enlace para crear una contraseña nueva.",
            title="Crea tu nueva contraseña",
            intro_html=(
                "Recibimos un pedido para cambiar la contraseña de <strong>{{ .Email }}</strong>. "
                "Toca el botón para crear una nueva."
            ),
            button_label="Crear contraseña nueva",
            note_html=(
                "El enlace sirve una sola vez. Si no lo pediste, ignora este correo: tu contraseña sigue igual."
            ),
        ),
        make(
            "magic_link",
            f"Tu enlace para entrar a {brand_name}",
            preheader="Entra a tu tienda sin escribir la contraseña.",
            title="Entra a tu tienda",
            intro_html="Toca el botón para entrar con <strong>{{ .Email }}</strong>.",
            button_label="Entrar a mi tienda",
            note_html="El enlace sirve una sola vez. Si no lo pediste, ignora este correo.",
        ),
        make(
            "email_change",
            "Confirma tu nuevo correo",
            preheader="Confirma el cambio de correo de tu cuenta.",
            title="Confirma tu nuevo correo",
            intro_html=(
                "Pediste cambiar el correo de tu cuenta de <strong>{{ .Email }}</strong> "
                "a <strong>{{ .NewEmail }}</strong>."
            ),
            button_label="Confirmar el cambio",
            note_html="Si no lo pediste, ignora este correo y tu cuenta sigue con el correo de siempre.",
        ),
    ]
