# Local Auth Strategy Compatible With Supabase

Fecha: 2026-07-14

## Contexto

En produccion, Supabase Auth es el servicio que emite y valida tokens. El backend recibe:

```text
Authorization: Bearer <access_token>
```

y obtiene desde el token el `user_id`, `email` y `store_id`.

En local no disponemos de Supabase Auth, por lo que el backend usa un flujo alternativo
controlado por la variable `DEBUG`.

## Implementacion Actual

No existe un `AUTH_PROVIDER` intercambiable. La decision es por `DEBUG`:

- `DEBUG=true`: login valida usuario + password_hash contra PostgreSQL local, emite JWT firmado con `JWT_SECRET`.
- `DEBUG=false`: login delega en Supabase Auth (`supabase.auth.sign_in_with_password`).

### 1. Seed de usuarios

El seed se ejecuta automaticamente al iniciar el backend cuando `DEBUG=true` (ver `src/main.py` lifespan).
Crea una sola tienda (`Mi Tienda Demo`) con dos usuarios:

```text
Store: Mi Tienda Demo

Owner:
  email: dev@local.dev
  password: Dev12345!
  role: owner

Cashier:
  email: cashier@local.dev
  password: Dev12345!
  role: cashier
```

Productos creados:
- `Arroz 1kg` / SKU `ARR-001` / QR `DEMO-ARR-001`
- `Aceite 1l` / SKU `ACE-001` / QR `DEMO-ACE-001`
- `Fideo 400g` / SKU `FID-001` / QR `DEMO-FID-001`

### 2. Login local (`DEBUG=true`)

El endpoint `POST /api/v1/auth/login` en modo debug:

1. Busca al usuario por email en PostgreSQL.
2. Verifica que exista `password_hash`.
3. Verifica el password con `verify_password(dto.password, existing.password_hash)`.
4. Ejecuta `EnsureLocalUserUseCase` para refrescar `last_login_at`.
5. Retorna un JWT local firmado y los datos del usuario incluyendo campos de billing.

Request:
```json
{
  "email": "dev@local.dev",
  "password": "Dev12345!"
}
```

Response:
```json
{
  "access_token": "<local-jwt>",
  "refresh_token": "dev-refresh-123",
  "user": {
    "id": "<uuid>",
    "email": "dev@local.dev",
    "store_id": "<uuid>",
    "full_name": "Owner Dev",
    "role": "owner",
    "subscription_status": "trial",
    "access_status": "active",
    "trial_expires_at": "<iso-date>",
    "days_until_trial_ends": 30
  }
}
```

El `refresh_token` es fijo (`dev-refresh-123`) en modo debug; en produccion viene de Supabase.

### 3. Login produccion (`DEBUG=false`)

Delega completamente en Supabase Auth:

```python
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
response = supabase.auth.sign_in_with_password(...)
```

Luego busca o crea el usuario local con `EnsureLocalUserUseCase` y construye la misma respuesta.

### 4. Request autenticado

```http
GET /api/v1/products
Authorization: Bearer <local-jwt>
```

El middleware `get_current_user`:
- En modo debug: decodifica el JWT local con `decode_access_token()`.
- En produccion: verifica con Supabase (`supabase.auth.get_user()`).

Ambos caminos retornan un `CurrentUserDTO` con la misma estructura.

### 5. Payload JWT Local

```json
{
  "sub": "<user-id>",
  "email": "dev@local.dev",
  "store_id": "<store-id>",
  "role": "owner",
  "iss": "inventory-local-auth",
  "aud": "inventory-api",
  "exp": <timestamp>
}
```

### 6. DB: Tabla `users`

Columnas relevantes para auth local:

```text
id              uuid PK
store_id        uuid FK -> stores
email           text not null
password_hash   text nullable
last_login_at   timestamptz nullable
full_name       text not null
role            text not null
is_active       boolean default true
```

`password_hash` es nullable porque en produccion el password vive en Supabase.

### 7. JWT

Usamos `python-jose` para firmar y verificar JWTs localmente:

- `create_access_token(data, settings)` en `src/infrastructure/auth/jwt.py`
- `decode_access_token(token, settings)` en `src/infrastructure/auth/jwt.py`

## Flujo completo debug

```text
Request: POST /auth/login { email, password }
  │
  ├─ settings.DEBUG == True?
  │     YES → Buscar user por email en DB
  │            ├─ existe + password_hash?
  │            │     YES → verify_password()
  │            │            ├─ ok → EnsureLocalUserUseCase → _auth_response()
  │            │            └─ fail → 401
  │            └─ no → 401
  │
  └─ NO → Supabase Auth sign_in_with_password()
           └─ ok → EnsureLocalUserUseCase → _auth_response_from_supabase()
```

## Tests

Ver `tests/integration/` para tests de login local y multi-tenant.
