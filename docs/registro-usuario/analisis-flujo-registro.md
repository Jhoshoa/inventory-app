# Análisis del Flujo de Registro Manual

## Estado Actual

### DEBUG mode (`settings.DEBUG = True`)
- Bypassa Supabase completamente.
- Hashea la password con PBKDF2 localmente.
- Crea `Store` + `User` en la DB local.
- Retorna `{ success: true, message: "Tienda creada..." }`.
- El frontend redirige al login. Usuario inicia sesión manualmente.
- **No envía email de verificación** (no aplica en local).

### Production mode (`settings.DEBUG = False`)
- Llama a `supabase.auth.sign_up({ email, password, options: { data: { ... } } })`.
- Si `sign_up` retorna sesión → crea `Store` + `User` en DB local, retorna tokens, usuario queda autenticado inmediatamente.
- Si `sign_up` retorna solo usuario (sin sesión) → el código CRASHA en `_auth_response_from_supabase` porque `response.session is None`.

### Problema crítico

**Supabase tiene "Confirm email" habilitado por defecto.** Con esa configuración:

```
sign_up() → { user: { ... }, session: null }
```

El código actual **asume** que `session` siempre viene, pero con confirmación activa viene `null`. El endpoint se rompe, y el usuario nunca se registra.

## Cómo funciona un registro SaaS real

### Flujo estándar (email + password)

```
1. Usuario completa formulario (email, password, nombre, etc.)
2. Backend llama a supabase.auth.sign_up(email, password)
3. Supabase crea el usuario con email NO CONFIRMADO (confirmed_at = null)
4. Supabase envía email de confirmación con link mágico
5. Backend responde: "Revisa tu email para confirmar tu cuenta"
6. Usuario abre su email, hace clic en el link
7. Supabase marca email como confirmado (confirmed_at = now())
8. Usuario redirigido a login
9. Usuario inicia sesión manualmente con email + password
10. Backend recibe tokens, crea Store + User local, redirige a dashboard
```

### Alternativa: Auto-confirmar (sin verificación)

```
1. Usuario completa formulario
2. Backend llama a supabase.auth.sign_up(email, password)
3. Supabase crea usuario CON email confirmado inmediatamente
4. Supabase retorna { user, session }
5. Backend crea Store + User local, retorna tokens
6. Usuario queda autenticado y ve dashboard
```

Esto se configura en: **Supabase Dashboard → Authentication → Providers → Email → Confirm email = OFF**.

### Alternativa: Magic Link (sin password)

Algunos SaaS ni siquiera piden password en registro. Envían un magic link que al hacer clic autentica al usuario y le permite setear su password después.

---

## Análisis de la implementación actual

### ¿Qué está bien?
- El input de **password** en el formulario de registro es **correcto y estándar** para auth email+password. Casi todos los SaaS (GitHub, Notion, Slack, etc.) lo usan.
- El DTO tiene validaciones básicas (email, password >= 6, full_name, store_name).
- DEBUG mode funciona bien para desarrollo local.

### ¿Qué está mal?
1. **No maneja `session == None`**: Si Supabase tiene Confirm email ON (default), `sign_up` retorna `session = None` y el código explota.
2. **Crea Store/User antes de confirmar email**: En producción, si alguien se registra con un email que no le pertenece, se crea un store fantasma en DB local antes de que el email sea verificado.
3. **Auto-login sin verificación**: Si Confirm email está OFF, cualquiera que conozca un email puede registrarse sin verificar que realmente le pertenece. Esto es aceptable para ciertos casos (MVP, internal tools), pero no para un SaaS público serio.

### ¿Se necesita una tabla de códigos de verificación?
**No.** Supabase ya maneja el flujo completo:
- Almacena usuarios en `auth.users` con `confirmed_at`, `email_confirmed_at`, etc.
- Envía emails de confirmación.
- Escucha clics en links de confirmación.
- Expira tokens automáticamente (el link de confirmación expira en 24h por defecto).

Implementar una tabla propia significaría **duplicar** toda esa lógica. Solo tendría sentido si:
- Queremos un flujo de verificación custom (ej. código SMS, código OTP de 6 dígitos).
- Queremos almacenar metadatos adicionales por cada intento de registro.

Pero para el caso estándar de email + password, la tabla `auth.users` de Supabase es suficiente.

## Recomendaciones

### Para AHORA (que el usuario ya tiene Supabase conectado)

#### Opción A: Desactivar Confirm email en Supabase (recomendado para desarrollo)
- Abrir Supabase Dashboard → Authentication → Providers → Email → **Confirm email = OFF**.
- El flujo actual funciona sin cambios: usuario se registra, recibe tokens, ve dashboard.
- **Ventaja:** Cero cambios de código, cero configuración SMTP, flujo rápido para desarrollo.
- **Desventaja:** Cualquiera con un email puede registrarse sin verificarlo.
- Aceptable para MVP/desarrollo.

#### Opción B: Arreglar el código para manejar `session == null`
- Modificar el endpoint `/register` para detectar si Supabase retornó sesión o no.
- Si no hay sesión: responder `{ success: true, message: "Revisa tu email..." }` sin crear Store/User local.
- Si hay sesión: flujo actual (crear Store/User, retornar tokens).
- **Requiere:** Un webhook de Supabase (`auth.users` → `INSERT` con `email_confirmed_at`) que cree el Store y User local cuando el email sea confirmado.
- **Ventaja:** Flujo seguro, estándar SaaS.
- **Desventaja:** Requiere configuración de Supabase webhooks + lógica extra.

### Para LOCAL (desarrollo)

DEBUG mode ya funciona bien: bypass completo de Supabase, hashea password local, crea usuario en DB local. No necesita cambios.

### Recomendación final

1. **Para desarrollo inmediato:** Desactivar Confirm email en Supabase Dashboard.
2. **Para producción real:** Implementar Opción B (webhook + registro diferido).

## ¿El registro manual sigue funcionando ahora mismo?

Con `ENVIRONMENT=production` y `DEBUG=false` (configuración actual):

**Sí, SIEMPRE QUE Confirm email esté desactivado en Supabase.** Si está activado, el endpoint crashea.

Para verificar el estado actual, ir a Supabase Dashboard → Authentication → Settings → **Confirm email**.

## Diagrama del flujo ideal (producción)

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Usuario  │     │ API Backend  │     │ Supabase    │     │ DB Local     │
│ (Browser)│     │ (FastAPI)   │     │ Auth        │     │ (PostgreSQL) │
└────┬─────┘     └──────┬──────┘     └──────┬──────┘     └──────┬───────┘
     │                  │                    │                  │
     │ POST /register   │                    │                  │
     │ email+password   │                    │                  │
     │─────────────────>│                    │                  │
     │                  │ POST /auth/v1/signup                   │
     │                  │───────────────────>│                  │
     │                  │                    │                  │
     │                  │  {user, session:null}                 │
     │                  │<───────────────────│                  │
     │                  │                    │                  │
     │  201 {success:   │                    │                  │
     │  "Revisa email"} │                    │                  │
     │<─────────────────│                    │                  │
     │                  │                    │                  │
     │  ─── Usuario hace clic en link ──────│                  │
     │                  │                    │                  │
     │                  │                    │  Webhook         │
     │                  │                    │  auth.users      │
     │                  │                    │  INSERT          │
     │                  │                    │──────────────────│
     │                  │                    │  confirmed_at    │
     │                  │                    │──────────────────│
     │                  │  ←──── Crea Store + User ────────────│
     │                  │                    │                  │
     │  POST /login     │                    │                  │
     │  email+password  │                    │                  │
     │─────────────────>│  POST /auth/v1/token                  │
     │                  │───────────────────>│                  │
     │                  │  {user, session}   │                  │
     │                  │<───────────────────│                  │
     │                  │  Crea/actualiza    │                  │
     │                  │  User local        │                  │
     │                  │────────────────────────────────────>│
     │  200 {tokens}    │                    │                  │
     │<─────────────────│                    │                  │
```

## Solución implementada (Julio 2026)

### Register endpoint (`auth.py:177-240`)

```python
try:
    response = supabase.auth.sign_up({...})
except AuthApiError as e:
    if "already registered" in str(e).lower():
        raise HTTPException(409, "Este email ya esta registrado")
    raise

if not response.session:
    return RegisterSuccessDTO(
        message="Revisa tu email para confirmar tu cuenta. Luego inicia sesion."
    )

# session exists → Confirm email OFF → auto-login
# Crear Store + User, retornar tokens
```

- Si Confirm email está ON → `session == null` → responde con mensaje.
- Si Confirm email está OFF → `session != null` → flujo anterior (auto-login).
- Si el email ya existe en Supabase → 409 Conflict.
- Captura `AuthApiError` y lo traduce a HTTPException.

### Login endpoint (`auth.py:141-174`)

```python
store_id = raw_user.get("store_id")
if not store_id:
    # Sin store_id en metadata → buscar en DB local
    existing = await user_repo.get_by_email(dto.email)
    if existing is None or existing.store_id is None:
        raise UnauthorizedError("No se pudo resolver la tienda del usuario")
    raw_user["store_id"] = str(existing.store_id)
else:
    # store_id en metadata → crear store lazy si no existe
    existing_store = await store_repo.get_by_id(UUID(str(store_id)))
    if existing_store is None:
        store = Store(id=UUID(str(store_id)), name=raw_user.get("store_name", "Mi Tienda"))
        await store_repo.save(store)
```

- Si el `store_id` está en los metadatos de Supabase (seteado durante `sign_up`) pero no existe en DB local → se crea automáticamente.
- Si no tiene `store_id` en metadata → fallback a DB local.
- `EnsureLocalUserUseCase` se encarga de crear el User si es la primera vez que loguea.

### Flujo completo con Confirm email ON

```
Registro:
  Form → POST /register → sign_up() → {user, session:null}
  → "Revisa tu email..."
  → Supabase envía email de confirmación
  → Usuario hace clic → email confirmado (confirmed_at = now())

Login:
  Form → POST /login → sign_in_with_password() → {user, session}
  → store_id en metadata → store no existe local → Store.create()
  → EnsureLocalUserUseCase → User.create()
  → Tokens → Dashboard
```

### Seguridad

| Escenario | ¿Qué pasa? |
|-----------|------------|
| Email no existe | Supabase lo rechaza (SMTP falla o no se puede enviar) |
| Email existe pero no es del usuario | No puede confirmar = no puede loguear |
| Email inventado | No puede confirmar = no puede loguear |
| Email existente + confirmado | Loguea normal, store se crea lazy |

## Conclusión

| Aspecto | Estado |
|---------|--------|
| Input de password en registro | ✅ Correcto (estándar SaaS) |
| Tabla de códigos de verificación | ❌ No necesario (Supabase lo maneja) |
| Manejo de `session == null` | ✅ Arreglado: responde con mensaje en vez de crash |
| Creación de Store/User | ✅ Store se crea lazy en primer login; User con EnsureLocalUserUseCase |
| Protección contra emails inválidos | ✅ Confirm email ON + SMTP bloquean usuarios no verificados |
| Flujo local | ✅ DEBUG mode funciona sin Supabase |
| Configuración SMTP | ⚠️ Necesaria en Supabase para que los emails de confirmación se envíen |
