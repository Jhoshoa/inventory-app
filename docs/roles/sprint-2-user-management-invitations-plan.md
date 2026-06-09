# Sprint 2 User Management and Cashier Invitations Plan

Fecha: 2026-05-21

## Objetivo

Implementar la gestion basica de usuarios para tiendas: listar miembros, activar/desactivar usuarios, cambiar roles owner/cashier e invitar cajeros por correo. El resultado debe permitir que un `owner` administre su equipo desde la web sin tocar la base de datos manualmente.

Sprint 1 cerro la matriz simple de permisos y dejo `cashier` operativo. Sprint 2 debe cerrar el onboarding y mantenimiento de esos usuarios.

## Skills Aplicados

- `fastapi-templates`: mantener use cases, repositorios async, dependencias `require_owner`, DTOs claros y tests de integracion por contrato.
- `next-best-practices`: paginas protegidas como Server Components, Server Actions autenticadas, `cookies()`/session server-side y route handlers solo donde aporten.
- `vercel-react-best-practices`: evitar waterfalls con cargas paralelas, mantener Client Components chicos para formularios/dialogs y no pasar datos innecesarios al cliente.

## Estado Actual Verificado

### Ya existe

Backend:

- `users` tiene `id`, `email`, `store_id`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`, `last_login_at`.
- `UserRepository` ya lista usuarios por tienda y actualiza rol/estado.
- `GET /api/v1/users` existe y requiere `owner`.
- `PATCH /api/v1/users/{user_id}/role` existe y requiere `owner`.
- `PATCH /api/v1/users/{user_id}/status` existe y requiere `owner`.
- Hay proteccion para no remover/desactivar el ultimo owner activo.
- `cashier` demo ya puede existir por seed/dev-login.
- Backend ya es la autoridad de permisos.

Web:

- `/dashboard/settings` ya esta protegido para `owner`.
- `SettingsOverview` muestra usuario, tienda, rol y matriz de permisos.
- La gestion real de usuarios sigue como placeholder.
- Existen cookies httpOnly y `requireSession`.
- Existen helpers de permisos centralizados.

### Falta

- Tabla/modelo/repositorio para invitaciones.
- Flujo de invitacion por email.
- Endpoint para crear invitacion.
- Endpoint para listar invitaciones pendientes/revocadas/aceptadas.
- Endpoint para revocar invitacion.
- Endpoint o pagina publica para aceptar invitacion.
- Integracion con Supabase Auth para crear/confirmar usuario invitado en produccion.
- Estrategia dev/local para probar invitaciones sin proveedor real de email.
- Pantalla real de usuarios en Settings.
- Formularios web para:
  - invitar cashier.
  - reenviar invitacion.
  - revocar invitacion.
  - cambiar rol.
  - activar/desactivar usuario.
- Tests frontend/backend del flujo.

## Decision de Producto Para Sprint 2

Mantener alcance simple:

- Solo `owner` puede administrar usuarios.
- Solo se invita `cashier` por correo en este sprint.
- Cambiar rol entre `owner` y `cashier` se mantiene disponible para usuarios ya existentes.
- No implementar roles personalizados.
- No implementar multi-store por usuario.
- No implementar pantalla publica compleja de registro si el proveedor de auth aun no esta listo; se puede dejar contrato preparado y modo dev funcional.

## Alcance Incluido

### Backend

1. Crear tabla `user_invitations`.
2. Crear entidad/modelo/repositorio de invitaciones.
3. Crear use cases:
   - `CreateUserInvitationUseCase`
   - `ListUserInvitationsUseCase`
   - `RevokeUserInvitationUseCase`
   - `AcceptUserInvitationUseCase`
4. Agregar endpoints owner-only:
   - `GET /api/v1/user-invitations`
   - `POST /api/v1/user-invitations`
   - `POST /api/v1/user-invitations/{invitation_id}/revoke`
   - `POST /api/v1/user-invitations/{invitation_id}/resend`
5. Agregar endpoint publico o semi-publico para aceptar:
   - `POST /api/v1/user-invitations/accept`
6. Agregar puerto de email:
   - `IEmailSender`
   - implementacion noop/local para dev.
   - implementacion real futura por provider.
7. Agregar token seguro:
   - generar token aleatorio.
   - guardar hash.
   - enviar token raw solo por correo/link.
8. Agregar tests de integracion para invitaciones y tenant isolation.

### Web

1. Reemplazar placeholder de Settings por seccion real de equipo.
2. Consumir:
   - usuarios de tienda.
   - invitaciones.
3. Agregar componentes:
   - `UsersTable`
   - `InviteCashierForm`
   - `InvitationsTable`
   - `UserRoleSelect` o dialog simple.
   - `UserStatusToggle` o dialog simple.
4. Agregar Server Actions:
   - invitar cashier.
   - cambiar rol.
   - activar/desactivar.
   - revocar invitacion.
   - reenviar invitacion.
5. Agregar pagina publica de aceptar invitacion si el backend lo soporta:
   - `/invite/[token]`
   - formulario minimo de nombre/password si aplica.
6. Mantener Settings owner-only.
7. Mostrar estados claros:
   - pending invite.
   - accepted.
   - revoked.
   - expired.
   - errores 403/409/422.

## Fuera de Alcance

- RBAC granular.
- Roles custom por tienda.
- Permisos por sucursal/caja.
- Multi-store por usuario.
- Auditoria completa de todas las acciones.
- Recuperacion de password.
- Billing por numero de usuarios.
- Plantillas HTML avanzadas de email.
- Dashboard de actividad de usuarios.

## Modelo de Datos Propuesto

Tabla `user_invitations`:

```text
id uuid primary key
store_id uuid not null references stores(id)
email varchar(255) not null
role varchar(20) not null default 'cashier'
token_hash varchar(255) not null unique
status varchar(20) not null default 'pending'
expires_at timestamptz not null
invited_by_user_id uuid not null references users(id)
accepted_by_user_id uuid null references users(id)
created_at timestamptz not null
updated_at timestamptz not null
accepted_at timestamptz null
revoked_at timestamptz null
last_sent_at timestamptz null
send_count int not null default 0
```

Indices:

```text
ix_user_invitations_store_status (store_id, status)
ix_user_invitations_email (email)
ix_user_invitations_expires_at (expires_at)
uq_pending_invitation_store_email (store_id, lower(email), status = pending)
```

Nota para SQLite tests: si el indice parcial complica compatibilidad, validar invitacion pendiente duplicada en repositorio/use case y dejar el indice parcial solo para PostgreSQL si es necesario.

Estados:

- `pending`
- `accepted`
- `revoked`
- `expired`

Roles permitidos en invitacion Sprint 2:

- `cashier`

Preparar columna `role` para futuro, pero rechazar `owner` en `CreateUserInvitationUseCase` por ahora.

## Contratos API Propuestos

### Listar usuarios

Ya existe:

```http
GET /api/v1/users?limit=50&offset=0
```

Respuesta actual se mantiene.

### Cambiar rol

Ya existe:

```http
PATCH /api/v1/users/{user_id}/role
```

Payload:

```json
{ "role": "cashier" }
```

Mantener reglas:

- Solo owner.
- No remover ultimo owner activo.
- No modificar usuarios de otra tienda.

### Activar/desactivar usuario

Ya existe:

```http
PATCH /api/v1/users/{user_id}/status
```

Payload:

```json
{ "is_active": false }
```

Mantener reglas:

- Solo owner.
- No desactivar ultimo owner activo.
- Usuario inactivo no puede operar.

### Crear invitacion

```http
POST /api/v1/user-invitations
```

Payload:

```json
{
  "email": "cashier@example.com",
  "full_name": "Caja Turno Tarde"
}
```

Respuesta:

```json
{
  "id": "uuid",
  "email": "cashier@example.com",
  "role": "cashier",
  "status": "pending",
  "expires_at": "2026-05-28T00:00:00Z",
  "created_at": "2026-05-21T00:00:00Z",
  "last_sent_at": "2026-05-21T00:00:00Z"
}
```

Reglas:

- Solo owner.
- Email normalizado a lowercase/trim.
- Si ya existe usuario activo con ese email en la misma tienda: `409`.
- Si existe invitacion pending no expirada para ese email: `409` o reenviar explicitamente.
- Expiracion recomendada: 7 dias.
- En dev, devolver opcionalmente `dev_invite_url` solo si `DEBUG=true`.

### Listar invitaciones

```http
GET /api/v1/user-invitations?status=pending&limit=50&offset=0
```

Reglas:

- Solo owner.
- Store-scoped.
- No devolver `token_hash`.
- Mostrar `accepted_by_user_id` si aplica.

### Revocar invitacion

```http
POST /api/v1/user-invitations/{invitation_id}/revoke
```

Reglas:

- Solo owner.
- Solo invitaciones de la misma tienda.
- Si ya accepted: `409`.
- Si ya revoked: idempotente o `409`; recomendar idempotente con respuesta actual.

### Reenviar invitacion

```http
POST /api/v1/user-invitations/{invitation_id}/resend
```

Reglas:

- Solo owner.
- Solo pending no expirada.
- Rotar token por seguridad.
- Actualizar `last_sent_at` y `send_count`.
- En dev, devolver `dev_invite_url`.

### Aceptar invitacion

```http
POST /api/v1/user-invitations/accept
```

Payload en produccion:

```json
{
  "token": "raw-token-from-link",
  "password": "password123",
  "full_name": "Cashier Name"
}
```

Respuesta:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "cashier@example.com",
    "store_id": "uuid",
    "full_name": "Cashier Name",
    "role": "cashier"
  }
}
```

Reglas:

- Token raw se hashea y se busca por `token_hash`.
- Rechazar revoked/accepted/expired.
- Crear usuario en Supabase Auth o confirmar usuario, segun provider.
- Crear/actualizar usuario local con `role = cashier`.
- Marcar invitacion como accepted.
- Login automatico solo si el provider puede devolver session de forma segura.

Decision pragmatica:

- Si Supabase invite flow requiere confirmacion por email propia, aceptar invitacion puede devolver estado `accepted` y pedir login posterior.
- Para dev, crear usuario local y devolver dev auth response es suficiente.

## Arquitectura Backend Recomendada

### Capas

```text
domain/
  entities/user_invitation.py
  repositories/user_invitation_repository.py

application/
  dto/user_invitation_dto.py
  ports/email_sender.py
  use_cases/user_invitations/
    create_invitation.py
    list_invitations.py
    resend_invitation.py
    revoke_invitation.py
    accept_invitation.py

infrastructure/
  database/models/user_invitation_model.py
  database/repositories/user_invitation_repository.py
  services/email/noop_email_sender.py

presentation/api/v1/
  user_invitations.py
```

### Token

Usar `secrets.token_urlsafe(32)` para token raw.

Hash:

```python
sha256(token.encode("utf-8")).hexdigest()
```

No guardar token raw.

### Email Sender

Puerto:

```python
class IEmailSender(Protocol):
    async def send_user_invitation(self, *, email: str, invite_url: str, store_name: str) -> None: ...
```

Implementacion dev:

- No envia correo real.
- Loguea o guarda ultimo envio si se necesita test.
- En respuesta debug puede exponer `dev_invite_url`.

Implementacion real futura:

- Resend, SendGrid, Supabase email invite o proveedor elegido.
- No bloquear Sprint 2 si aun no hay proveedor definido.

### Seguridad

- `token_hash` nunca sale en API.
- No listar invitaciones fuera de `store_id`.
- No permitir aceptar token expirado.
- No permitir aceptar invitacion si ya hay usuario local activo en otra tienda con ese email, salvo decision futura multi-store.
- Rate limit queda fuera, pero dejar nota para hardening.

## Arquitectura Web Recomendada

### Estructura

```text
apps/web/
  app/(app)/dashboard/settings/page.tsx
  app/(auth)/invite/[token]/page.tsx
  src/features/users/
    api.ts
    actions.ts
    schemas.ts
    types.ts
    components/
      UsersSection.tsx
      UsersTable.tsx
      InviteCashierForm.tsx
      InvitationsTable.tsx
      UserRoleDialog.tsx
      UserStatusDialog.tsx
  src/features/settings/components/
    SettingsOverview.tsx
```

### Settings Page

Server Component:

- `requireSession()`.
- owner guard ya existe.
- cargar usuarios e invitaciones en paralelo:

```ts
const [users, invitations] = await Promise.all([
  listUsers(),
  listUserInvitations(),
]);
```

Client Components solo para:

- formulario de invitacion.
- dialogs de rol/estado.
- botones revocar/reenviar.

### Server Actions

Cada Server Action debe:

1. leer token con `getAuthToken()`.
2. validar form con schema local.
3. llamar backend.
4. normalizar errores.
5. `revalidatePath("/dashboard/settings")`.

No usar `localStorage`.

### UX

Settings deberia tener secciones compactas:

1. Perfil de sesion y tienda.
2. Usuarios activos/inactivos.
3. Invitaciones pendientes.
4. Matriz de permisos como referencia.

Estados:

- Empty usuarios: no deberia pasar porque owner existe.
- Empty invitaciones: mensaje simple y formulario visible.
- Invite success: mostrar alerta con email.
- Dev mode: si backend devuelve `dev_invite_url`, mostrarlo en un panel de desarrollo.
- Conflict: "Ya existe una invitacion pendiente" o "Este email ya pertenece a la tienda".

## Implementacion Por Pasos

### 1. Migracion y modelo de invitaciones

Archivos probables:

- `apps/backend/src/infrastructure/database/alembic/versions/008_create_user_invitations.py`
- `apps/backend/src/infrastructure/database/models/user_invitation_model.py`
- `apps/backend/src/domain/entities/user_invitation.py`

Tareas:

- Crear tabla.
- Agregar indices.
- Exportar modelo en `models/__init__.py`.
- Mantener compatibilidad SQLite tests.

### 2. Repositorio y use cases

Archivos probables:

- `apps/backend/src/domain/repositories/user_invitation_repository.py`
- `apps/backend/src/infrastructure/database/repositories/user_invitation_repository.py`
- `apps/backend/src/application/use_cases/user_invitations/*.py`

Tareas:

- `get_by_id(store_id, invitation_id)`.
- `get_pending_by_email(store_id, email)`.
- `get_by_token_hash(token_hash)`.
- `list_by_store(store_id, status, limit, offset)`.
- `save(invitation)`.
- `mark_accepted`.
- `mark_revoked`.
- Validar duplicados y expiracion en use cases.

### 3. Email port y token service

Archivos probables:

- `apps/backend/src/application/ports/email_sender.py`
- `apps/backend/src/infrastructure/services/email/noop_email_sender.py`
- `apps/backend/src/presentation/dependencies.py`

Tareas:

- Agregar `get_email_sender`.
- Crear helper de token/hash.
- En dev, construir invite URL desde setting `WEB_APP_URL` o default `http://localhost:3000`.

Config sugerida:

```python
WEB_APP_URL: str = "http://localhost:3000"
INVITATION_EXPIRE_DAYS: int = 7
```

### 4. API backend

Archivos probables:

- `apps/backend/src/application/dto/user_invitation_dto.py`
- `apps/backend/src/presentation/api/v1/user_invitations.py`
- `apps/backend/src/presentation/api/v1/router/main registration`

Tareas:

- Crear router.
- Registrar router en API v1.
- Aplicar `require_owner` a endpoints administrativos.
- Endpoint accept no debe requerir usuario logueado.
- Normalizar respuestas sin token hash.

### 5. Web API/actions/types

Archivos probables:

- `apps/web/src/features/users/types.ts`
- `apps/web/src/features/users/schemas.ts`
- `apps/web/src/features/users/api.ts`
- `apps/web/src/features/users/actions.ts`

Tareas:

- Tipar `User`, `UserListResponse`, `UserInvitation`.
- Validar email de invitacion.
- Acciones server para invite/revoke/resend/role/status.
- Normalizar errores con helpers existentes.

### 6. Settings UI real

Archivos probables:

- `apps/web/app/(app)/dashboard/settings/page.tsx`
- `apps/web/src/features/settings/components/SettingsOverview.tsx`
- `apps/web/src/features/users/components/*.tsx`

Tareas:

- Reemplazar placeholder por usuarios e invitaciones.
- Mantener matriz de permisos.
- Usar tablas compactas.
- Dialogs para acciones destructivas o sensibles.
- No usar cards anidadas; mantener secciones limpias.

### 7. Accept invitation page

Archivos probables:

- `apps/web/app/(auth)/invite/[token]/page.tsx`
- `apps/web/src/features/users/components/AcceptInvitationForm.tsx`

Tareas:

- Leer token desde route params async.
- Mostrar formulario minimo.
- Server Action llama backend accept.
- Si backend devuelve session, setear cookies y redirect a dashboard.
- Si no devuelve session, mostrar "Invitacion aceptada, inicia sesion".

Decision:

- Si Supabase real no esta listo, implementar modo dev completo y dejar produccion con contrato claro o adapter pendiente.

## Tests Requeridos

### Backend

1. `test_owner_creates_cashier_invitation`
2. `test_cashier_cannot_create_invitation`
3. `test_invitation_email_is_normalized`
4. `test_duplicate_pending_invitation_is_rejected`
5. `test_inviting_existing_store_user_is_rejected`
6. `test_owner_lists_only_store_invitations`
7. `test_owner_revokes_pending_invitation`
8. `test_revoke_accepted_invitation_is_rejected`
9. `test_resend_invitation_rotates_token_and_updates_sent_fields`
10. `test_accept_invitation_creates_cashier_user`
11. `test_accept_invitation_rejects_expired_token`
12. `test_accept_invitation_rejects_revoked_token`
13. `test_accept_invitation_is_single_use`
14. `test_invitation_token_hash_is_not_returned`
15. `test_invitation_does_not_cross_store`

### Web unit/component

1. `inviteCashierSchema_rejects_invalid_email`
2. `UsersTable_renders_role_and_status`
3. `UsersTable_disables_last_owner_danger_action`
4. `InviteCashierForm_submits_valid_email`
5. `InvitationsTable_renders_pending_expired_revoked`
6. `InvitationsTable_shows_dev_invite_url_when_present`
7. `UserRoleDialog_submits_role_change`
8. `UserStatusDialog_submits_status_change`
9. `SettingsOverview_renders_users_and_invitations`
10. `AcceptInvitationForm_validates_password`

### Web route/action tests

1. `inviteCashierAction_requires_session`
2. `inviteCashierAction_revalidates_settings`
3. `changeUserRoleAction_forwards_payload`
4. `changeUserStatusAction_forwards_payload`
5. `revokeInvitationAction_handles_conflict`
6. `acceptInvitationAction_sets_auth_cookies_when_tokens_return`

### Optional E2E

1. Owner opens Settings and sees users table.
2. Owner invites `cashier2@example.com`.
3. Pending invitation appears.
4. Owner revokes invitation.
5. Cashier cannot open Settings.
6. Dev invite link accepts invitation and redirects/logs in.

## Validacion Manual

Backend:

```powershell
cd apps/backend
py -m alembic upgrade head
py -m pytest tests -q -p no:cacheprovider
py -m ruff check src tests --no-cache
```

Web:

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Manual:

1. Iniciar backend y web.
2. Login como `dev@local.dev`.
3. Abrir `/dashboard/settings`.
4. Invitar `cashier2@local.dev`.
5. Ver invitacion pending.
6. Copiar dev invite URL si `DEBUG=true`.
7. Aceptar invitacion.
8. Confirmar que aparece usuario `cashier`.
9. Cambiar rol a owner y de vuelta a cashier.
10. Desactivar usuario.
11. Confirmar que cashier no puede abrir Settings.

## Criterios de Aceptacion

- Owner puede listar usuarios de su tienda desde Settings.
- Owner puede invitar un cashier por email.
- Invitaciones quedan store-scoped y no exponen `token_hash`.
- Owner puede ver invitaciones pendientes y revocarlas.
- Owner puede reenviar invitaciones pendientes.
- Token de invitacion expira y es single-use.
- Aceptar invitacion crea usuario local `cashier`.
- Usuarios existentes pueden cambiar rol/estado desde UI.
- No se puede dejar la tienda sin owner activo.
- Cashier no puede gestionar usuarios ni invitaciones.
- Tests backend y web cubren happy paths, permisos, conflictos y tenant isolation.

## Riesgos y Decisiones

- **Supabase invite flow:** puede requerir integracion especifica del proveedor. Mitigar con puerto de auth/email y modo dev funcional.
- **Email real:** no bloquear Sprint 2 por proveedor. Implementar `IEmailSender` y noop/local; provider real puede conectarse despues.
- **Token raw en dev:** solo devolver invite URL en `DEBUG=true`. En produccion nunca devolver token raw en API.
- **Usuario con email en otra tienda:** para v1 rechazar. Multi-store queda fuera.
- **Reenvio:** rotar token evita que links viejos sigan vivos.
- **Session vieja tras cambio de rol propio:** backend decide permisos. UI puede requerir relogin/refresh en sprint posterior si el owner se cambia a cashier.

## Siguiente Sprint Recomendado

Sprint 3 deberia enfocarse en auditoria operativa:

- `created_by` en ventas.
- usuario que ajusta stock.
- usuario que anula ventas.
- usuario que confirma importaciones.
- filtros por usuario/cajero en ventas.
- mostrar responsable en historiales.

RBAC sigue fuera hasta que owner/cashier no alcance.
