# Correos de la app

La app envía dos tipos de correo, con el mismo diseño y el mismo logo:

| Correo | Quién lo envía | Dónde se configura |
|---|---|---|
| Invitación a la tienda (Usuarios) | La API, por SMTP | Variables `EMAIL_ENABLED` y `SMTP_*` (Dokploy / `.env`) |
| Confirmar cuenta, recuperar contraseña, enlace para entrar, cambio de correo | Supabase Auth | Panel de Supabase (SMTP y plantillas) |

Las dos partes usan **la misma cuenta SMTP** (hoy Brevo). Para cambiar de proveedor
solo cambian los valores `SMTP_*` y los del panel de Supabase; el código no.

## Archivos de esta carpeta

Se generan desde `apps/backend/src/infrastructure/services/email/templates.py`,
el mismo código que arma la invitación. **No se editan a mano**:

```bash
cd apps/backend
python -m scripts.build_email_templates
```

Un test falla si quedan desactualizados. Después de regenerarlos, copia los cambios
al panel de Supabase (paso 3).

- `confirmation.html`: confirmar el correo al crear la tienda.
- `recovery.html`: recuperar la contraseña.
- `magic_link.html`: entrar con un enlace (la app no lo usa hoy, pero Supabase puede enviarlo).
- `email_change.html`: confirmar un correo nuevo.
- `subjects.json`: el asunto de cada uno.

El logo sale de `{{ .SiteURL }}/email/logo.png` (`apps/web/public/email/logo.png`),
así que **Site URL** en Supabase tiene que ser la dirección pública de la web.

## Producción

### 1. Dominio autenticado en Brevo

En Brevo → *Senders, Domains & Dedicated IPs* → *Domains*, agrega `tutiendamiga.digital`
y crea en el DNS los registros que indica (código de Brevo, DKIM y DMARC). Sin esto
los correos llegan a spam o Brevo los rechaza. Después agrega el remitente
`noreply@tutiendamiga.digital`.

Las credenciales SMTP están en Brevo → *SMTP & API* → *SMTP*: el usuario (`…@smtp-brevo.com`)
y una clave SMTP (no es la API key).

### 2. Variables de la API (Dokploy)

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USERNAME=<usuario SMTP de Brevo>
SMTP_PASSWORD=<clave SMTP de Brevo>
SMTP_FROM_EMAIL=noreply@tutiendamiga.digital
SMTP_FROM_NAME=Tu Tiendamiga
```

La API no arranca si `EMAIL_ENABLED=true` y falta `SMTP_HOST` o `SMTP_FROM_EMAIL`,
ni con `SMTP_SECURITY=none` en producción.

### 3. Supabase Auth (panel del proyecto)

**Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:

| Campo | Valor |
|---|---|
| Sender email | `noreply@tutiendamiga.digital` |
| Sender name | `Tu Tiendamiga` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username / Password | los mismos `SMTP_USERNAME` / `SMTP_PASSWORD` |

Sin SMTP propio, Supabase solo envía unos pocos correos por hora y únicamente a los
miembros del proyecto: nadie más recibiría la confirmación ni la recuperación.

**Authentication → Emails → Templates**: para *Confirm signup*, *Reset password*,
*Magic link* y *Change email address*, pega el HTML del archivo correspondiente y el
asunto de `subjects.json`.

**Authentication → URL Configuration**: *Site URL* = la URL pública de la web
(`APP_URL`), y en *Redirect URLs* `APP_URL/**`.

**Authentication → Rate Limits**: revisa *Rate limit for sending emails* (por hora)
con la cuota de tu plan de Brevo.

## Local y desarrollo

- **Stack local** (`docker-compose.local.yml`): la API envía por el mismo SMTP a
  Mailpit y Supabase Auth usa estas plantillas (las sirve el gateway). Todo se ve en
  http://localhost:8025. Nada sale de tu equipo salvo que pongas los `SMTP_*` de
  producción en `.env.local`.
- **API fuera de Docker** (`apps/backend/.env.example`): `SMTP_HOST=localhost`,
  `SMTP_PORT=1025`, `SMTP_SECURITY=none`, con el Mailpit del stack local levantado.
- **Sin correo** (`EMAIL_ENABLED=false`): no se envía nada; en Usuarios aparece el
  enlace de la invitación para compartirlo a mano.
