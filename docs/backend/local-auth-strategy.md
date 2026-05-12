# Local Auth Strategy Compatible With Supabase

Fecha: 2026-05-12

## Contexto

En produccion, Supabase Auth sera el servicio que emite y valida tokens. El backend recibe:

```text
Authorization: Bearer <access_token>
```

y obtiene desde el token el `user_id`, `email` y `store_id`.

En local, si usamos solo PostgreSQL, no tenemos Supabase Auth disponible. Hoy el backend puede usar un usuario fijo cuando `DEBUG=true`, pero eso no prueba bien login, tokens, multi-tenant ni autorizacion por tienda.

## Objetivo

Tener autenticacion local real para desarrollo y QA sin romper la compatibilidad futura con Supabase.

El contrato externo debe mantenerse igual:

```text
POST /api/v1/auth/login
-> access_token

GET /api/v1/products
Authorization: Bearer <access_token>
```

La diferencia debe ser interna y controlada por variable de entorno.

## Recomendacion

Agregar un proveedor de auth intercambiable:

```env
AUTH_PROVIDER=local
# o
AUTH_PROVIDER=supabase
```

Valores:

- `local`: usa usuarios guardados en PostgreSQL local, valida password local y emite JWT firmado por `JWT_SECRET`.
- `supabase`: delega login/register/refresh/verify a Supabase Auth.

## Flujo Local Propuesto

### 1. Seed de usuarios y tiendas

El seed local debe crear al menos dos tiendas y usuarios:

```text
Store A
  id: 00000000-0000-0000-0000-000000000101
  user: owner-a@local.dev
  password: secret123

Store B
  id: 00000000-0000-0000-0000-000000000202
  user: owner-b@local.dev
  password: secret123
```

Tambien debe crear productos separados por tienda:

```text
Store A products:
  Arroz 1kg
  Aceite 1l

Store B products:
  Cafe 250g
  Azucar 1kg
```

Esto permite probar que:

- `owner-a@local.dev` solo ve productos de Store A.
- `owner-b@local.dev` solo ve productos de Store B.
- Un `product_id` de Store B devuelve `404` si se consulta con token de Store A.

### 2. Login local

Request:

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "owner-a@local.dev",
  "password": "secret123"
}
```

Response:

```json
{
  "access_token": "<local-jwt>",
  "refresh_token": "<local-refresh-token-or-local-jwt>",
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "owner-a@local.dev",
    "store_id": "00000000-0000-0000-0000-000000000101",
    "full_name": "Owner Store A"
  }
}
```

### 3. Request autenticado

```http
GET /api/v1/products
Authorization: Bearer <local-jwt>
```

El backend valida el JWT local, extrae `store_id` y filtra la data por tenant.

## Payload JWT Local

El token local debe tener claims parecidos a lo que necesitamos de Supabase:

```json
{
  "sub": "00000000-0000-0000-0000-000000000001",
  "email": "owner-a@local.dev",
  "store_id": "00000000-0000-0000-0000-000000000101",
  "role": "owner",
  "iss": "inventory-local-auth",
  "aud": "inventory-api",
  "exp": 1778600000
}
```

La funcion `get_current_user` debe devolver la misma forma sin importar proveedor:

```python
{
    "id": UUID(...),
    "email": "owner-a@local.dev",
    "store_id": UUID(...),
    "role": "owner",
}
```

## Cambios Tecnicos Sugeridos

### Config

Agregar:

```python
AUTH_PROVIDER: str = "local"  # local | supabase
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
```

Mantener:

```python
JWT_SECRET: str
```

### DB

La tabla `users` actual sirve para identidad basica, pero para auth local conviene agregar:

```text
password_hash text nullable
last_login_at timestamptz nullable
```

`password_hash` debe ser nullable porque con `AUTH_PROVIDER=supabase` el password vive en Supabase, no en nuestra DB.

### Servicios

Crear una capa de auth:

```text
src/infrastructure/auth/
  local_auth.py
  supabase_auth.py
  auth_provider.py
```

Responsabilidades:

- `local_auth.py`
  - verificar password con hash
  - emitir JWT local
  - verificar JWT local
- `supabase_auth.py`
  - login/register/refresh usando Supabase
  - verificar JWT/token con Supabase
- `auth_provider.py`
  - escoger proveedor segun `AUTH_PROVIDER`

### Password Hash

Usar una libreria estandar como:

```text
passlib[bcrypt]
```

o `pwdlib`.

Nunca guardar passwords en texto plano.

### Endpoints

Mantener las mismas rutas:

```text
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
```

Internamente:

```python
if settings.AUTH_PROVIDER == "local":
    return local_auth.login(...)
return supabase_auth.login(...)
```

### Tests Recomendados

Agregar tests de integracion:

1. Login local exitoso.
2. Login local con password incorrecto devuelve `401`.
3. `GET /products` con token Store A solo devuelve productos Store A.
4. `GET /products/{id_store_b}` con token Store A devuelve `404`.
5. `GET /products` sin token devuelve `401` cuando `DEBUG=false`.
6. `AUTH_PROVIDER=supabase` no cambia el contrato del endpoint.

## Ventajas

- Permite probar auth real sin depender de Supabase localmente.
- Mantiene el contrato `Authorization: Bearer`.
- Permite probar aislamiento multi-tenant de verdad.
- Permite seed de usuarios, tiendas y productos deterministico.
- No bloquea la migracion a Supabase porque el provider se cambia por env var.

## Riesgos

- Se duplica parte del comportamiento de auth en local.
- Hay que cuidar que `local` nunca sea usado por accidente en produccion.
- Hay que documentar claramente `AUTH_PROVIDER=supabase` para ambientes reales.

Mitigacion:

```python
if ENVIRONMENT == "production" and AUTH_PROVIDER == "local":
    raise RuntimeError("Local auth is not allowed in production")
```

## Decision Recomendada

Implementar `AUTH_PROVIDER=local|supabase`.

Para la siguiente iteracion:

1. Agregar columnas `password_hash` y `last_login_at` a `users`.
2. Agregar seed con dos tiendas, dos usuarios y productos por tienda.
3. Implementar `local_auth.py` con JWT local.
4. Cambiar `/auth/login` para usar provider.
5. Cambiar `get_current_user` para verificar token con provider.
6. Agregar tests multi-tenant con tokens reales.

Esto nos da una experiencia local seria y sigue siendo compatible con Supabase.
