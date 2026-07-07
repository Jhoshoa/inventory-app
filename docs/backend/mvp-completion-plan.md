# MVP Completion Plan — Supabase Auth, OAuth, Deploy

## Objetivo

Completar la integración de autenticación con Supabase (incluyendo Google OAuth), habilitar registro en web, implementar refresh token automático, y preparar deploy a VPS Hostinger para mostrar el MVP a clientes.

---

## 1. Diagnóstico de Gaps por Componente

### 1.1 Backend Auth (FastAPI)

| # | Gap | Prioridad | Impacto | Archivos involucrados |
|---|-----|-----------|---------|----------------------|
| A1 | Login pierde `role` de `user_metadata` al crear usuario local | **P0** | Usuarios nuevos se crean siempre como `cashier` en lugar de su rol real | `auth.py:125-133` |
| A2 | Refresh token no verifica usuario local (no llama `EnsureLocalUserUseCase`, no actualiza `last_login_at`) | **P0** | Sesión se refresca incluso si el usuario está inactivo o no existe localmente | `auth.py:194-201` |
| A3 | No existe endpoint Google OAuth | **P0** | Usuarios no pueden autenticarse con Google | — |
| A4 | Use cases (`LoginUseCase`, `RegisterUseCase`, `RefreshTokenUseCase`) son stubs; lógica en router | **P1** | Viola Clean Architecture, no se puede testear unitariamente | `use_cases/auth/*.py` |
| A5 | Refresh token no usa DTO; acepta `refresh_token: str` sin validación | **P1** | Parámetro sin validación Pydantic | `auth.py:195` |
| A6 | `verify_jwt()` no retorna `full_name` ni `role` de metadata | **P2** | Inconsistente con `_auth_response_from_supabase()` | `supabase_auth.py:20-24` |
| A7 | Service Role Key usada para verify JWT (exceso de permisos) | **P2** | Riesgo de seguridad menor; usar anon key o verificación local | `supabase_auth.py:16` |
| A8 | Sin rate limiting en `/login` y `/register` | **P2** | Vulnerable a brute force | — |
| A9 | Errores revelan estado interno ("Usuario sin tienda asignada", etc.) | **P2** | Permite enumeración de usuarios/estados | Varios |
| A10 | `users.store_id` nullable; permite usuarios huérfanos | **P3** | Integridad de datos | `user_model.py:14` |

### 1.2 Web Auth (Next.js)

| # | Gap | Prioridad | Impacto | Archivos involucrados |
|---|-----|-----------|---------|----------------------|
| W1 | Sin refresh token automático — access_token expira a la hora y no hay mecanismo de renovación | **P0** | Dashboard se rompe después de 1 hora; usuario ve datos inconsistentes | `client.ts`, `session.ts` |
| W2 | No existe `/api/auth/refresh` route handler | **P0** | Sin endpoint para renovar token desde el frontend | — |
| W3 | Logout no revoca sesión en Supabase | **P1** | Token sigue siendo válido después de logout | `logout/route.ts` |
| W4 | Sin middleware de rutas protegidas (`middleware.ts`) | **P1** | Fácil olvidar `requireSession()` en nuevas páginas | — |
| W5 | Register page deshabilitado | **P1** | Usuarios no pueden registrarse desde web | `register/page.tsx` |
| W6 | Sesión cookie sin firma criptográfica (base64 simple) | **P2** | Impersonación si hay XSS | `session.ts` |
| W7 | `storeName` hardcoded como "Mi tienda" | **P2** | Todos ven el mismo nombre de tienda | `session.ts:51` |
| W8 | Sin estado de auth en cliente (Context/Provider) | **P2** | Componentes cliente no pueden acceder a la sesión | — |
| W9 | Manejo inconsistente de 401 entre features (unas muestran error, otras datos vacíos) | **P2** | UX inconsistente | Varios `api.ts` |
| W10 | Cookie `maxAge` no coincide con expiración real del token | **P3** | UI muestra sesión válida pero API falla | `server.ts:12-13` |

### 1.3 Mobile Auth (Expo/React Native)

| # | Gap | Prioridad | Impacto | Archivos involucrados |
|---|-----|-----------|---------|----------------------|
| M1 | Sin API client (Axios ni fetch wrapper) | **P1** | No puede llamar al backend | — |
| M2 | Sin auth store (Zustand) ni proveedor de sesión | **P1** | Sin estado de autenticación | — |
| M3 | Login/Register screens son UI stubs sin lógica | **P1** | No funcionales | `login.tsx`, `register.tsx` |
| M4 | Sin almacenamiento seguro de tokens | **P1** | No se persiste sesión | — |
| M5 | Sin gating de rutas (no redirige a login si no autenticado) | **P1** | Cualquier pantalla es accesible sin auth | `_layout.tsx` |
| M6 | Sin configuración de entorno (`.env`) | **P1** | No conoce URL del backend | — |
| M7 | Dependencias faltantes (`expo-secure-store`, `expo-constants`) | **P1** | Librerías necesarias no instaladas | `package.json` |
| M8 | Pantallas referenciadas en tabs no existen (sales, settings) | **P2** | Error de navegación | — |

### 1.4 Deploy & DevOps

| # | Gap | Prioridad | Impacto | Archivos involucrados |
|---|-----|-----------|---------|----------------------|
| D1 | Dockerfile usa Poetry pero `pyproject.toml` usa setuptools — **no compila** | **P0** | Docker build falla | `Dockerfile` |
| D2 | `docker-compose.yml` usa `--reload` en command | **P1** | Inseguro e ineficiente en prod | `docker-compose.yml` |
| D3 | Sin entrypoint que ejecute migraciones al arrancar | **P1** | Schema desactualizado al deployar | — |
| D4 | Sin `next.config.ts` con `output: 'standalone'` | **P1** | Docker image para web sería enorme | `next.config.ts` |
| D5 | Sin configuración de gunicorn | **P1** | Sin workers, sin timeouts, sin logging config | — |
| D6 | Sin `.dockerignore` | **P2** | Build context innecesariamente grande | — |
| D7 | Sin configuración nginx para reverse proxy | **P2** | Sin TLS, sin routing | — |
| D8 | Sin systemd service files | **P2** | Sin auto-start ni restart on crash | — |
| D9 | Sin workflow de CI/CD en GitHub Actions | **P2** | Deploy manual, propenso a errores | — |
| D10 | Env var naming inconsistente: `SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY` | **P2** | Confusión en configuración | `keepalive.py` |

---

## 2. Plan de Implementación por Fases

### Fase 1 (MVP — Mostrar a clientes)

Lo mínimo indispensable para que el MVP funcione correctamente en producción.

#### 1A — Backend: Fix refresh token endpoint

**Archivo:** `apps/backend/src/presentation/api/v1/auth.py`

```python
@router.post("/refresh", response_model=AuthResponseDTO)
async def refresh_token(
    dto: RefreshTokenDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        return _dev_auth_response()

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.refresh_session(dto.refresh_token)
    auth_response = _auth_response_from_supabase(response)

    raw_user = auth_response.user
    local_user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
        EnsureLocalUserInput(
            user_id=UUID(str(raw_user["id"])),
            email=str(raw_user["email"]),
            store_id=UUID(str(raw_user["store_id"])),
            full_name=raw_user.get("full_name"),
            touch_login=True,
        )
    )
    if not local_user.is_active:
        raise UnauthorizedError("Usuario inactivo")

    return _auth_response(
        auth_response.access_token,
        auth_response.refresh_token,
        user_id=local_user.id,
        email=local_user.email,
        store_id=local_user.store_id,
        full_name=local_user.full_name,
        role=local_user.role,
    )
```

**DTO nuevo** en `auth_dto.py`:
```python
class RefreshTokenDTO(BaseModel):
    refresh_token: str
```

#### 1B — Backend: Fix role perdido en login

**Archivo:** `apps/backend/src/presentation/api/v1/auth.py:125-133`

Cambiar `EnsureLocalUserInput` para pasar `role` desde `raw_user`:
```python
EnsureLocalUserInput(
    user_id=UUID(str(raw_user["id"])),
    email=str(raw_user["email"]),
    store_id=UUID(str(raw_user["store_id"])),
    full_name=raw_user.get("full_name"),
    role=str(raw_user.get("role") or "cashier"),
    touch_login=True,
)
```

#### 1C — Backend: Google OAuth endpoint

**Archivo:** `apps/backend/src/presentation/api/v1/auth.py`

Agregar dos endpoints:

1. **`POST /auth/oauth/google`** — Inicia flujo OAuth, retorna URL de redirección a Supabase
2. **`GET /auth/oauth/callback`** — Callback que recibe el código de autorización, lo canjea por sesión, y provisiona usuario local

```python
@router.post("/oauth/google")
async def oauth_google():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.sign_in_with_oauth({"provider": "google"})
    return {"url": response.url}


@router.post("/oauth/callback")
async def oauth_callback(
    code: str,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    session = supabase.auth.exchange_code_for_session({"auth_code": code})
    user_data = {
        "id": session.user.id,
        "email": session.user.email,
        "store_id": session.user.user_metadata.get("store_id"),
        "full_name": session.user.user_metadata.get("full_name") or session.user.user_metadata.get("name"),
        "role": session.user.user_metadata.get("role", "cashier"),
    }

    if not user_data["store_id"]:
        existing = await user_repo.get_by_email(user_data["email"])
        if existing and existing.store_id:
            user_data["store_id"] = str(existing.store_id)
        else:
            raise HTTPException(
                status_code=400,
                detail="Debes completar el registro de tu tienda primero",
            )

    local_user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
        EnsureLocalUserInput(
            user_id=UUID(user_data["id"]),
            email=user_data["email"],
            store_id=UUID(str(user_data["store_id"])),
            full_name=user_data.get("full_name"),
            role=str(user_data.get("role") or "cashier"),
            touch_login=True,
        )
    )

    return _auth_response(
        session.access_token,
        session.refresh_token,
        user_id=local_user.id,
        email=local_user.email,
        store_id=local_user.store_id,
        full_name=local_user.full_name,
        role=local_user.role,
    )
```

#### 1D — Web: Refresh token route + interceptor

**Crear** `apps/web/app/api/auth/refresh/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/env/server";
import { setAuthCookies } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const { refresh_token } = await request.json();
  if (!refresh_token) {
    return NextResponse.json({ message: "refresh_token requerido" }, { status: 400 });
  }

  const res = await fetch(`${getBackendApiUrl()}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!res.ok) {
    return NextResponse.json({ message: "No se pudo renovar la sesion" }, { status: 401 });
  }

  const data = await res.json();
  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response, data);
  return response;
}
```

**Modificar** `apps/web/src/lib/api/client.ts` para agregar interceptor de refresh:
```typescript
import { getAuthToken } from "@/lib/auth/session";

// ... dentro de apiRequest, cuando response.ok es false:
if (response.status === 401) {
  const refreshRes = await tryRefreshToken();
  if (refreshRes) {
    headers.set("authorization", `Bearer ${refreshRes.access_token}`);
    return await fetch(...); // retry original request
  }
}
```

**Agregar** función auxiliar `tryRefreshToken()` que lee la cookie de refresh token, llama a `/api/auth/refresh`, y devuelve el nuevo access token o null.

#### 1E — Web: Google OAuth button

**Modificar** `apps/web/src/features/auth/components/LoginForm.tsx`:

Agregar botón "Continuar con Google" debajo del formulario existente:
```tsx
<Button
  variant="outline"
  className="w-full"
  onClick={async () => {
    const res = await fetch("/api/auth/oauth/google");
    const { url } = await res.json();
    window.location.href = url;
  }}
>
  Continuar con Google
</Button>
```

**Crear** `apps/web/app/api/auth/oauth/google/route.ts` que hace proxy a `POST /api/v1/auth/oauth/google`.

#### 1F — Web: Habilitar register page

**Reescribir** `apps/web/app/(auth)/register/page.tsx` con un formulario funcional que llama a `POST /api/auth/register`.

**Crear** `apps/web/app/api/auth/register/route.ts` que hace proxy al backend y setea cookies.

#### 1G — Deploy: Dockerfile fix + configuración producción

**Reescribir** `apps/backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .[prod]

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
```

**Crear** `apps/backend/entrypoint.sh`:
```bash
#!/bin/sh
set -e
alembic upgrade head
exec gunicorn src.main:app --worker-class uvicorn.workers.UvicornWorker --workers ${WORKERS:-4} --bind 0.0.0.0:${PORT:-8000}
```

**Crear** `apps/backend/gunicorn.conf.py`:
```python
import multiprocessing
bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
accesslog = "-"
errorlog = "-"
loglevel = "info"
```

**Crear** `apps/backend/.dockerignore`:
```
__pycache__
*.pyc
.venv
.env
.git
.gitignore
README.md
tests/
```

**Actualizar** `apps/web/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
};

export default nextConfig;
```

**Crear** `apps/web/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

**Crear** `docker-compose.prod.yml` en raíz del proyecto:
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    env_file: apps/backend/.env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build:
      context: apps/backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    env_file: apps/backend/.env
    ports:
      - "127.0.0.1:8000:8000"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')"]
      interval: 10s
      timeout: 3s
      retries: 5

  web:
    build:
      context: apps/web
    restart: unless-stopped
    depends_on:
      - api
    env_file: apps/web/.env
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  pgdata:
```

### Fase 2 (Hardening)

Mejoras importantes post-MVP pero no críticas para mostrar el producto.

| Item | Descripción | Archivos |
|------|-------------|----------|
| H1 | Rate limiting con slowapi | `main.py`, `dependencies.py` |
| H2 | Error messages genéricos en producción | `auth.py`, `exceptions.py` |
| H3 | `middleware.ts` en Next.js para rutas protegidas | `src/middleware.ts` |
| H4 | Cerrar sesión en Supabase al hacer logout | `logout/route.ts` |
| H5 | Firma criptográfica de session cookie | `session.ts` |
| H6 | AuthProvider (React Context) para client components | `src/providers/` |
| H7 | Refactor use cases: mover lógica de `auth.py` a `LoginUseCase`, `RegisterUseCase`, `RefreshTokenUseCase` | Varios |
| H8 | Tests para producción (mock Supabase) | `tests/` |

### Fase 3 (Mobile + Polish)

Implementación completa del flujo de auth en mobile.

| Item | Descripción | Archivos |
|------|-------------|----------|
| M1 | API client + auth store | `src/services/`, `src/features/` |
| M2 | Secure storage (expo-secure-store) | `src/services/storage/` |
| M3 | Auth provider | `src/providers/` |
| M4 | Login/Register screens funcionales | `app/(auth)/` |
| M5 | Route gating | `app/_layout.tsx` |
| M6 | Env config | `.env`, `app.config.ts` |

---

## 3. Estrategia de Deploy — Hostinger VPS

### Opción recomendada: Supabase Cloud + VPS para backend + frontend

```
Supabase Cloud (PostgreSQL + Auth + Google OAuth)
       | HTTPS
Hostinger VPS (2 vCPU, 4 GB RAM)
  ├── Docker: Backend (FastAPI + gunicorn) → puerto 8000
  ├── PM2/systemd: Web (Next.js standalone) → puerto 3000
  └── nginx: Reverse proxy con TLS (Let's Encrypt)
       ├── / → Next.js
       └── /api/* → Backend
```

### Por qué esta opción:

| Aspecto | Supabase Cloud + VPS | Todo en VPS |
|---------|---------------------|-------------|
| **Setup inicial** | 1 hora (solo configurar Supabase) | 4+ horas (instalar/configurar PostgreSQL) |
| **Auth/Google OAuth** | 2 clicks en dashboard Supabase | Implementación manual completa |
| **Backups DB** | Automáticos (Supabase) | Manual (cron + pg_dump) |
| **Costo mensual** | ~$0-25 (Supabase Free/Pro) + $10-15 (VPS) | $10-15 (VPS solo) |
| **Mantenimiento** | Mínimo | Alto (upgrades, seguridad) |
| **Escalabilidad** | Escala separadamente | Cuello de botella único |

### Pasos para deploy:

```bash
# 1. VPS — Instalar dependencias
ssh root@tu-vps
apt update && apt install -y docker docker-compose nginx certbot

# 2. Supabase — Crear proyecto y obtener credenciales
#    Habilitar Google OAuth en Authentication → Providers → Google
#    Obtener SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Backend — Configurar variables
cat > apps/backend/.env << EOF
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]
JWT_SECRET=[generate-with: openssl rand -hex 32]
CORS_ALLOWED_ORIGINS=https://tudominio.com
EXPOSE_ERROR_DETAILS=false
WORKERS=4
EOF

# 4. Web — Configurar variables
cat > apps/web/.env << EOF
BACKEND_API_URL=https://tudominio.com
NEXT_PUBLIC_APP_URL=https://tudominio.com
EOF

# 5. Migraciones y build
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 6. Nginx — Configurar reverse proxy
cat > /etc/nginx/sites-available/inventory << 'NGINX'
server {
    listen 80;
    server_name tudominio.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# 7. SSL
certbot --nginx -d tudominio.com
```

---

## 4. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Supabase Auth rate limit (30 req/min en Free) | Media | Alto — login falla para usuarios | Implementar caché local de JWT; considerar plan Pro ($25/mes) si hay tráfico |
| Token de Supabase expira (1h default) | Alta | Alto — sesiones se caen | Refresh token automático (Fase 1D) |
| Google OAuth callback falla por CORS | Media | Medio — usuarios no pueden loguearse | Configurar correctamente URLs en Supabase Dashboard (Site URL, Redirect URIs) |
| VPS sin recursos (2 vCPU, 4GB) para Docker + Node + Python + nginx | Baja | Medio — rendimiento lento | Usar `--memory` limits en Docker; monitorear con `htop`; escalar si necesario |
| Migraciones fallan en deploy | Baja | Alto — app caída | Entrypoint ejecuta `alembic upgrade head` antes de arrancar; tener `alembic downgrade` preparado |
| Fuga de service role key | Baja | Crítico — acceso total a DB | No exponer en frontend; rotar si se sospecha compromiso |
| Olvidar correr seed data en producción | Media | Bajo — tienda demo no existe | Seed debe correr automáticamente si `users` table está vacía, o documentarse como paso post-deploy |

---

## 5. Orden de Implementación Propuesto

```
Fase 1 — MVP (lo implementamos ahora)
├── 1A: Fix refresh token (backend)
├── 1B: Fix role pérdida en login (backend)
├── 1C: Google OAuth endpoints (backend)
├── 1D: Refresh token route + interceptor (web)
├── 1E: Google OAuth button (web)
├── 1F: Habilitar register (web)
├── 1G: Dockerfile fix + config producción
└── 1H: Seed data mejorado (opcional)

Fase 2 — Hardening (post-MVP)
├── H1-H8: Rate limiting, errores, middleware, sesión firmada, etc.

Fase 3 — Mobile (post-MVP)
└── M1-M6: Auth completo en mobile
```
