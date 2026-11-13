# Producción en servidor propio (Dokploy)

La app corre completa en el VPS, sin Supabase en la nube: API, web, Postgres,
Supabase Auth (GoTrue, el mismo programa que usa Supabase), un gateway y el backup
diario. Todo está en `docker-compose.yml`; el stack local
(`docker-compose.local.yml`) usa exactamente los mismos servicios, más Mailpit.

```
internet ──https──> Traefik (Dokploy) ──> web :3010 ──> api :8001 ──┬──> inventory-db :5432
                                           │                        └──> inventory-auth-gateway :8000 ──> inventory-auth :9999
                                           └── /auth/v1/verify, /authorize, /callback ──> inventory-auth-gateway
                                                                     inventory-db-backup ──> inventory-db (cada día)
```

| Servicio | Imagen | Para qué | RAM medida |
|---|---|---|---|
| `inventory-db` | `docker/postgres` (supabase/postgres 17) | Datos de la app y usuarios de Auth | ~130 MB |
| `inventory-auth` | `supabase/gotrue:v2.197.0` | Registro, login, recuperar contraseña, Google, sus correos | ~30 MB |
| `inventory-auth-gateway` | `docker/auth-gateway` (nginx) | Auth en `/auth/v1` y las plantillas de correo | ~20 MB |
| `inventory-db-backup` | `docker/db-backup` (postgres 17 + aws-cli) | `pg_dump` diario, copia afuera opcional | ~10 MB |

## Seguridad

- **Ningún servicio publica puertos.** Postgres, Auth y el gateway solo se ven en la
  red interna de Docker. No agregues `ports:` en producción. Los puertos que Docker
  publica se saltan el firewall (UFW).
- **Desde internet solo llegan 3 rutas de Auth**, y lo hacen a través de la web
  (`apps/web/src/lib/auth/publicAuthRoutes.ts`):
  - `/auth/v1/verify`: los enlaces de los correos;
  - `/auth/v1/authorize` y `/auth/v1/callback`: la ida y la vuelta de Google.

  `/admin`, `/token`, `/user` y el resto quedan internos.
- **Nombres con el prefijo `inventory-`**, para no confundirse con el `db` de otra app si
  Dokploy une las redes.
- **Secretos generados**, que la API rechaza si quedan como en `.env.example`. La contraseña
  de Postgres sirve para los roles `postgres`, `supabase_admin` y `supabase_auth_admin`,
  que solo son accesibles desde la red interna.
- **Auth:** registro con correo confirmado, enlaces que vencen en 1 hora, rotación de
  refresh tokens, contraseñas con bcrypt y URLs de retorno limitadas a `APP_URL/**`.

## Puesta en marcha (servidor nuevo)

### 1. Secretos

En tu equipo o en el VPS:

```bash
python3 apps/backend/scripts/generate_auth_secrets.py
```

Imprime `POSTGRES_PASSWORD`, `JWT_SECRET`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY`. Guárdalos en tu gestor de contraseñas.

### 2. Variables en Dokploy

En la app `inventory-app` → *Environment*, con `.env.example` como guía:

- **Ya no se usan:** `DATABASE_URL` y `SUPABASE_URL` (las arma el compose) y las claves de Supabase en la nube.
- **Nuevas:** las 4 de arriba, más:
  - `AUTH_GOOGLE_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`;
  - `AUTH_RATE_LIMIT_EMAIL_SENT`;
  - `BACKUP_*`.
- **Correo:** las `SMTP_*` de Brevo, que ahora son **obligatorias**, porque Auth envía la confirmación de cuenta con ellas.
- **Sin cambios:** `APP_URL`, `CLOUDINARY_*`, la marca y el contacto.

### 3. Google Cloud

En *APIs & Services → Credentials*, edita el cliente OAuth (Web):

- *Authorized JavaScript origins*: `https://tutiendamiga.digital` (tu `APP_URL`).
- *Authorized redirect URIs*: `https://tutiendamiga.digital/auth/v1/callback`.
  Puedes quitar la URL de `*.supabase.co`.
- En la pantalla de consentimiento, el dominio autorizado `tutiendamiga.digital`.
  Google mostrará "para continuar a tutiendamiga.digital".

### 4. Brevo

El dominio `tutiendamiga.digital` tiene que estar autenticado (DKIM y DMARC) y el remitente
`noreply@tutiendamiga.digital` agregado. Ver `supabase/email-templates/README.md`.

### 5. Desplegar

En Dokploy, *Deploy*. La primera vez se crean los volúmenes, Postgres inicializa sus
roles, Auth crea sus tablas y la API aplica las migraciones (`alembic upgrade head`).
El dominio sigue apuntando al servicio `web` (puerto 3010): no hace falta otro dominio.

### 6. Revisión (lista fija)

1. Crear una tienda nueva. Llega "Confirma tu correo en Tu Tiendamiga" desde `noreply@`, con el logo.
2. Abrir el enlace del correo: vuelve a Entrar con "Correo confirmado. Ya puedes entrar."
3. Entrar con correo y contraseña.
4. Continuar con Google: el selector de Google dice tu dominio y vuelve a la app con la sesión.
5. Salir → ¿Olvidaste tu contraseña? → llega el correo → nueva contraseña → entra.
6. Configuración → Usuarios → invitar: llega el correo, se acepta, y la persona
   vuelve a entrar con su contraseña.
7. Vender y vender sin conexión.
8. `docker compose exec inventory-db-backup backup.sh now`: termina con `ok`.

## Backups

- **Cada día** desde `BACKUP_HOUR` (hora de `BACKUP_TIMEZONE`): `pg_dump` de los esquemas
  `public` (la app) y `auth` (usuarios). Se verifica con `pg_restore --list` y se guarda
  en el volumen `inventory-db-backups` durante `BACKUP_KEEP_DAYS` días. Al arrancar, si
  no hay backup del día, lo hace enseguida.
- **Copia fuera del servidor (muy recomendada):** con `BACKUP_S3_*` se sube cada backup
  a R2, B2 o S3, cifrado con AES-256 si defines `BACKUP_PASSPHRASE`. La retención afuera
  se configura con una regla de ciclo de vida del bucket (por ejemplo, borrar a los 30 días).
- **Estado:** el contenedor queda *unhealthy* si pasan más de 26 h sin un backup bueno.
  Los registros están en `docker compose logs inventory-db-backup`.

### Restaurar

Probado: base nueva restaurada con los mismos datos, y restauración en el lugar con
login posterior.

```bash
docker compose exec inventory-db-backup ls -lt /backups
docker compose stop api inventory-auth
docker compose exec -e CONFIRM=si inventory-db-backup restore.sh /backups/inventory-AAAA-MM-DD_HHMM.dump
docker compose start inventory-auth api
```

Reemplaza los esquemas `public` y `auth` por los del archivo. Las contraseñas siguen
funcionando, porque se restauran con los usuarios. Para una copia cifrada de afuera,
bájala al volumen y usa el archivo `.dump.enc` (se descifra con `BACKUP_PASSPHRASE`).

## Volver atrás

- **Al despliegue anterior:** Dokploy → *Deployments* → *Rollback*, o desplegar el commit anterior.
- **A Supabase en la nube:** restaurar las variables anteriores (`DATABASE_URL`,
  `SUPABASE_URL` y las claves de Supabase) en un commit anterior a esta migración.
  Los datos creados en el VPS no estarían en Supabase.

## Mantenimiento

- **Actualizar Auth:** cambiar la versión de `supabase/gotrue` en `docker-compose.yml`,
  probarla en el stack local y desplegar. Aplica sus migraciones solo.
- **Actualizar Postgres:** el parche (17.x) cambiando `docker/postgres/Dockerfile`. Un cambio
  de versión mayor necesita `pg_dump` y restaurar en una base nueva.
- **Vigilar el disco del VPS** y el estado del backup.
- **El workflow `daily-keepalive.yml`** era para que Supabase no pausara el proyecto. Con
  servidor propio no hace falta.
