# Sprint 5 Auth, Users and Permissions Plan

Fecha: 2026-05-19

## Objetivo

Cerrar el flujo de identidad para v1: registro, login, tienda local, usuario local, roles minimos y permisos simples. Despues de Sprint 4 el backend ya soporta inventario, ventas, sync, reportes e importacion asistida; el siguiente riesgo critico es depender solo de metadata de Supabase para determinar `store_id` y permisos.

## Principios

- `store_id` sigue siendo la frontera multi-tenant.
- El backend debe tener su propia verdad operativa en `stores` y `users`.
- Supabase Auth autentica; la BD local autoriza y relaciona usuario-tienda.
- Mantener roles simples para v1: `owner` y `cashier`.
- Evitar un sistema complejo de permisos hasta validar uso real.
- Todo endpoint sensible debe usar DI, use cases y tests de aislamiento.

## Estado Actual

### Ya existe

- `stores` y `users` existen en la base.
- `User` tiene `role`, `store_id` e `is_active`.
- `StoreRepository` permite leer/guardar tienda.
- `auth.py` usa Supabase en no-debug y retorna metadata con `store_id`.
- En debug existe `DEV_STORE_ID` y `DEV_USER_ID`.
- `get_current_user` extrae `store_id` e `id` del token si existen.

### Falta

- Repositorio SQL para `users`.
- Crear `store` local durante registro.
- Crear/actualizar `user` local durante registro o primer login.
- Resolver `store_id` desde `users` cuando no venga en JWT.
- Exigir usuario activo.
- Definir dependencias de rol.
- Proteger endpoints administrativos, especialmente `PATCH /store`.
- Endpoint para listar usuarios de la tienda y cambiar rol/estado.
- Tests de permisos owner/cashier.

## Alcance Incluido

- Agregar `UserRepository` SQLAlchemy.
- Extender `IUserRepository` con `save`, `list_by_store` y `set_role/status`.
- Crear use cases de auth provisioning:
  - `RegisterStoreOwnerUseCase`
  - `EnsureLocalUserUseCase`
  - `GetCurrentUserContextUseCase`
- Crear dependencias:
  - `get_user_repo`
  - `require_owner`
  - `require_active_user`
- Actualizar `/auth/register` para crear store + user local.
- Actualizar `/auth/login` para sincronizar usuario local cuando aplique.
- Agregar router `/users` para administracion minima de usuarios de tienda.
- Proteger `PATCH /store` para `owner`.
- Tests de registro, login sync, roles y tenant isolation.

## Fuera de Alcance

- Invitaciones por email.
- Multi-store por usuario.
- Permisos granulares por modulo.
- Recuperacion de password.
- Auditoria avanzada de usuarios.
- Billing/subscriptions.

## Modelo de Roles

### `owner`

Puede:

- Ver y modificar tienda.
- Gestionar usuarios de su tienda.
- Crear, editar y eliminar productos.
- Confirmar imports.
- Ver dashboard/reportes.
- Vender y ajustar stock.

### `cashier`

Puede:

- Ver productos.
- Crear ventas.
- Consultar stock.
- Usar busqueda/QR/POS.

No puede:

- Modificar configuracion de tienda.
- Gestionar usuarios.
- Eliminar productos.
- Confirmar imports.
- Cambiar roles.

## Cambios de Datos

La tabla `users` ya existe, pero requiere indices y restricciones mas claras.

Revisar/agregar en migracion `007`:

- `users.email` unique ya existe.
- `users.store_id` index ya existe.
- Agregar indice compuesto `(store_id, role)`.
- Agregar `updated_at timestamptz` si no existe.
- Opcional: `last_login_at timestamptz`.

No se recomienda agregar tablas nuevas para roles en v1.

## API Propuesta

### Registro

```http
POST /api/v1/auth/register
```

Reglas:

- En produccion: registrar usuario en Supabase.
- Crear `stores` local con `store_name`.
- Crear `users` local con `role = owner`.
- Incluir `store_id`, `role` y `full_name` en metadata Supabase cuando sea posible.
- Si falla Supabase antes de DB local, no crear store local.
- Si falla DB local despues de Supabase, devolver error claro y dejar test documentado; compensacion avanzada queda fuera.

Respuesta:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "owner@store.com",
    "store_id": "uuid",
    "full_name": "Owner",
    "role": "owner"
  }
}
```

### Login

```http
POST /api/v1/auth/login
```

Reglas:

- Autenticar con Supabase.
- Resolver `user.id`, `email`, `store_id`, `full_name`.
- Si el usuario local no existe y el JWT trae `store_id`, crearlo.
- Si existe, actualizar `full_name`, `is_active` y `last_login_at`.
- Si el usuario local esta inactivo, rechazar con 401/403.

### Usuario actual

```http
GET /api/v1/auth/me
```

Devuelve el contexto local:

```json
{
  "id": "uuid",
  "email": "user@store.com",
  "store_id": "uuid",
  "full_name": "User",
  "role": "cashier",
  "is_active": true
}
```

### Usuarios de tienda

```http
GET /api/v1/users
```

Solo `owner`. Lista usuarios de la misma tienda.

### Cambiar rol

```http
PATCH /api/v1/users/{user_id}/role
```

Solo `owner`.

Payload:

```json
{ "role": "cashier" }
```

Reglas:

- No permitir que un owner se quite a si mismo el ultimo rol owner.
- No permitir modificar usuarios de otra tienda.

### Activar/desactivar usuario

```http
PATCH /api/v1/users/{user_id}/status
```

Solo `owner`.

Payload:

```json
{ "is_active": false }
```

Reglas:

- No permitir desactivar al ultimo owner activo.
- Usuario inactivo no puede usar endpoints protegidos.

## Dependencias y Autorizacion

Agregar un contexto tipado:

```python
CurrentUserContext(
    id,
    email,
    store_id,
    full_name,
    role,
    is_active,
)
```

Dependencias:

- `get_current_user`: mantiene autenticacion base.
- `get_current_user_context`: resuelve usuario local.
- `require_active_user`: rechaza inactivos.
- `require_owner`: exige `role == owner`.

Aplicar:

- `PATCH /store`: owner.
- `GET/PATCH /users`: owner.
- `POST /inventory-imports/{id}/confirm`: owner.
- `DELETE /products/{id}`: owner.
- Mantener venta/product search accesible para cashier.

## Repositorio

`IUserRepository` debe incluir:

- `get_by_id(user_id)`
- `get_by_email(email)`
- `get_by_store(store_id, user_id)`
- `list_by_store(store_id, limit, offset)`
- `count_active_owners(store_id)`
- `save(user)`
- `update_role(store_id, user_id, role)`
- `update_status(store_id, user_id, is_active)`
- `touch_last_login(user_id)`

SQLAlchemy:

- Toda consulta administrativa debe filtrar por `store_id`.
- Usar indices por `store_id`.
- No cargar datos de usuarios de otros tenants.

## Tests Requeridos

### Auth/provisioning

1. `test_register_creates_store_and_owner_user`
   - Mock Supabase.
   - Verificar store local y user owner.

2. `test_login_creates_missing_local_user_from_metadata`
   - Usuario autenticado con `store_id` crea fila local.

3. `test_login_rejects_inactive_local_user`
   - Usuario inactivo no obtiene contexto valido.

4. `test_auth_me_returns_local_role_and_store`
   - Respuesta incluye `role`, `store_id`, `is_active`.

### Permisos

5. `test_cashier_cannot_update_store`
   - `PATCH /store` devuelve 403.

6. `test_owner_can_update_store`
   - Owner modifica tienda.

7. `test_cashier_cannot_confirm_inventory_import`
   - Confirmacion requiere owner.

8. `test_cashier_cannot_delete_product`
   - Delete requiere owner.

### Usuarios

9. `test_owner_lists_only_store_users`
   - No filtra usuarios de otra tienda.

10. `test_owner_changes_cashier_role`
   - Cambio permitido dentro de la tienda.

11. `test_cannot_remove_last_active_owner`
   - Protege administracion minima.

12. `test_cannot_modify_user_from_another_store`
   - Devuelve 404.

## Validaciones Manuales

```powershell
cd apps/backend
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
docker compose up -d db
python -m alembic upgrade head
```

Probar en Swagger:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `PATCH /api/v1/users/{id}/role`
- `PATCH /api/v1/store` con owner y cashier.

## Criterios de Aceptacion

- Registro crea store y owner local.
- Login asegura usuario local o rechaza si no hay tenant resoluble.
- El contexto de usuario viene de BD local.
- Usuarios inactivos no pueden operar.
- `owner` y `cashier` tienen permisos diferenciados.
- Endpoints administrativos no cruzan tiendas.
- Tests de auth, permisos y tenant isolation pasan.
- Alembic queda en `007 (head)` en PostgreSQL.

## Riesgos y Decisiones

- **Supabase + DB local no son una sola transaccion:** aceptar riesgo para v1 y devolver errores claros. Compensacion automatica puede venir despues.
- **Metadata incompleta:** login debe rechazar si no puede resolver `store_id` desde metadata o usuario local.
- **Ultimo owner:** protegerlo evita tiendas sin administrador.
- **Roles simples:** suficiente para tiendas pequenas; permisos granulares serian sobre-diseno ahora.
- **Dev mode:** debe seguir funcionando con `DEV_STORE_ID` y `DEV_USER_ID`, creando seed local si es necesario.

## Resultado Esperado

Al cerrar Sprint 5, el backend deja de depender solamente de metadata externa para operar tenants. Cada usuario tiene una fila local, una tienda, un rol y estado activo. Esto permite construir web/mobile con permisos reales y preparar v1 sin abrir huecos administrativos entre tiendas.
