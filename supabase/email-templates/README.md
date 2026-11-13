# Correos de la app

Todos los correos salen con el mismo diseño, el mismo logo, el mismo remitente y la
misma cuenta SMTP. Por dentro los genera la parte de la app que corresponde:

| Correo | Lo genera |
|---|---|
| Invitación a la tienda (Usuarios) | La API |
| Confirmar cuenta, recuperar contraseña, enlace para entrar, cambio de correo | Supabase Auth (en el mismo servidor) |

Se configura una sola vez, con las variables `SMTP_*` (hoy Brevo). Para cambiar de
proveedor solo cambian esas variables, sin tocar el código.

## Archivos de esta carpeta

Se generan desde `apps/backend/src/infrastructure/services/email/templates.py`,
el mismo código que arma la invitación. **No se editan a mano**:

```bash
cd apps/backend
python -m scripts.build_email_templates
```

Un test falla si quedan desactualizados. El gateway las incluye al construirse, así que
cualquier cambio llega con el siguiente despliegue.

- `confirmation.html`: confirmar el correo al crear la tienda.
- `recovery.html`: recuperar la contraseña.
- `magic_link.html`: entrar con un enlace (la app no lo usa hoy, pero Supabase puede enviarlo).
- `email_change.html`: confirmar un correo nuevo.
- `subjects.json`: el asunto de cada uno.

El logo sale de `{{ .SiteURL }}/email/logo.png` (`apps/web/public/email/logo.png`),
es decir, de `APP_URL` (Auth la recibe como `GOTRUE_SITE_URL`).

## Producción

Auth corre en el mismo servidor (ver `docs/despliegue/servidor-propio.md`) y toma estas
plantillas, sus asuntos y el SMTP de las variables: no hay nada que copiar a mano en un
panel. Lo único externo es el dominio en Brevo.

### Dominio autenticado en Brevo

En Brevo → *Senders, Domains & Dedicated IPs* → *Domains*, agrega `tutiendamiga.digital`
y crea en el DNS los registros que indica (código de Brevo, DKIM y DMARC). Sin esto
los correos llegan a spam o Brevo los rechaza. Después agrega el remitente
`noreply@tutiendamiga.digital`.

Las credenciales SMTP están en Brevo → *SMTP & API* → *SMTP*: el usuario (`…@smtp-brevo.com`)
y una clave SMTP (no es la API key). Van en `SMTP_USERNAME` y `SMTP_PASSWORD`.

## Local y desarrollo

- **Stack local** (`docker-compose.local.yml`): la API y Auth envían por SMTP a Mailpit,
  con estas mismas plantillas. Todo se ve en http://localhost:8025. Nada sale de tu equipo
  salvo que pongas los `SMTP_*` de producción en `.env.local`.
- **API fuera de Docker** (`apps/backend/.env.example`): `SMTP_HOST=localhost`,
  `SMTP_PORT=1025`, `SMTP_SECURITY=none`, con el Mailpit del stack local levantado.
- **Sin correo** (`EMAIL_ENABLED=false`): no se envía nada; en Usuarios aparece el
  enlace de la invitación para compartirlo a mano.
