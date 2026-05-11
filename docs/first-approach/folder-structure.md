# Folder Structure — Monorepo Inventory App

## Principios de organización

- **Monorepo** con 3 aplicaciones en un mismo repositorio
- **Backend**: Python + FastAPI + Clean Architecture
- **Frontend mobile**: Feature-first (cada feature con sus componentes, hooks, servicios)
- **Frontend web**: Feature-first + Next.js App Router
- **Tipos compartidos**: OpenAPI → TypeScript (generado automático desde FastAPI)
- **Queues**: Celery + Redis (en lugar de BullMQ, que es de Node.js)

---

## 1. Estructura raíz

```
inventory-app/
│
├── apps/
│   ├── backend/                       # Python + FastAPI (Clean Architecture)
│   ├── mobile/                        # React Native + Expo
│   └── web/                           # Next.js (frontend web)
│
├── docs/
│   ├── brainstorm/
│   │   ├── analisis-inventario-app.md
│   │   ├── analisis-foto-voz-qr.md
│   │   ├── analisis-offline-first.md
│   │   ├── analisis-bd-cache-colas.md
│   │   └── analisis-cron-keepalive.md
│   └── first-approach/
│       ├── first-approach-v1.md
│       └── folder-structure.md        # ← Este archivo
│
├── .github/
│   └── workflows/
│       ├── daily-keepalive.yml        # Cron keepalive + tipo de cambio
│       ├── ci-backend.yml
│       ├── ci-mobile.yml
│       └── ci-web.yml
│
├── scripts/
│   └── keepalive.py                   # GitHub Actions keepalive script
│
├── .gitignore
├── .env.example
└── README.md
```

### ¿Por qué no hay `packages/shared` como en Node.js?

Porque el backend es Python y los frontends son TypeScript. La comunicación se da a través de la **API REST** y la **especificación OpenAPI** que FastAPI genera automáticamente. El flujo es:

```
FastAPI (Python)
    │
    ├── Genera openapi.json automáticamente
    │
    ├── orval / openapi-typescript → genera types/client TypeScript para web
    │
    └── orval / openapi-typescript → genera types/client TypeScript para mobile
```

Esto asegura que los tipos del backend y frontends **siempre estén sincronizados**.

---

## 2. Stack Tecnológico Actualizado

### Backend (Python + FastAPI)

| Componente | Tecnología | Propósito |
|---|---|---|
| **API Server** | FastAPI (Python 3.12+) | REST API con OpenAPI automático |
| **ORM** | SQLAlchemy 2.0 + asyncpg | PostgreSQL asíncrono |
| **Validaciones** | Pydantic v2 | Schemas, DTOs, serialización |
| **Migrations** | Alembic | Control de versiones de BD |
| **Queues** | Celery + Redis | OCR, sync offline, notificaciones |
| **Auth** | Supabase Auth (supabase-py) | JWT + RLS |
| **OCR / AI** | EasyOCR + Pillow + scikit-learn | Procesamiento de imágenes |
| **File storage** | Cloudinary (cloudinary-py) | Fotos de productos |
| **HTTP client** | httpx | Llamadas a APIs externas |
| **Testing** | pytest + pytest-asyncio | Tests unitarios e integración |

### Frontend (sin cambios respecto al análisis original)

| Componente | Tecnología | Propósito |
|---|---|---|
| **App Móvil** | React Native + Expo | Principal canal de uso (venta, consulta rápida) |
| **Web App** | React + Next.js | Administración pesada (reportes, configuración) |
| **BD Local (mobile)** | WatermelonDB (SQLite) | Offline-first |
| **BD Local (web)** | Dexie.js (IndexedDB) | Offline parcial |
| **UI Kit** | Tailwind CSS + shadcn/ui (web) / NativeWind (mobile) | Consistencia visual |
| **API Client** | orval (generado desde OpenAPI) | Tipo seguro, sincronizado con backend |

---

## 3. Backend — Clean Architecture (`apps/backend/`)

```
apps/backend/
│
├── src/
│   ├── domain/                         # CAPA DOMAIN — Core del negocio
│   │   ├── entities/                   # Entidades (reglas de negocio)
│   │   │   ├── __init__.py
│   │   │   ├── product.py              # Product entity
│   │   │   ├── sale.py                 # Sale entity
│   │   │   ├── sale_item.py            # SaleItem entity
│   │   │   ├── store.py                # Store entity
│   │   │   ├── user.py                 # User entity
│   │   │   └── exchange_rate.py        # ExchangeRate entity
│   │   │
│   │   ├── value_objects/              # Value Objects
│   │   │   ├── __init__.py
│   │   │   ├── price.py                # Price(value, currency)
│   │   │   ├── stock.py                # Stock(quantity, min_stock)
│   │   │   ├── sku.py                  # SKU(code)
│   │   │   └── phone.py                # Phone(number)
│   │   │
│   │   └── repositories/              # Interfaces de repositorio (ABC)
│   │       ├── __init__.py
│   │       ├── product_repository.py
│   │       ├── sale_repository.py
│   │       ├── store_repository.py
│   │       ├── user_repository.py
│   │       └── sync_repository.py
│   │
│   ├── application/                   # CAPA APPLICATION — Casos de uso
│   │   ├── use_cases/
│   │   │   ├── __init__.py
│   │   │   ├── products/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_product.py
│   │   │   │   ├── update_product.py
│   │   │   │   ├── delete_product.py
│   │   │   │   ├── get_product.py
│   │   │   │   ├── list_products.py
│   │   │   │   └── update_stock.py
│   │   │   │
│   │   │   ├── sales/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_sale.py
│   │   │   │   ├── get_sale.py
│   │   │   │   ├── list_sales.py
│   │   │   │   └── return_sale.py
│   │   │   │
│   │   │   ├── photos/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── upload_photo.py
│   │   │   │   └── process_photo_ocr.py
│   │   │   │
│   │   │   ├── sync/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── sync_push.py
│   │   │   │   ├── sync_pull.py
│   │   │   │   └── resolve_conflict.py
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── login.py
│   │   │   │   ├── register.py
│   │   │   │   └── refresh_token.py
│   │   │   │
│   │   │   └── store/
│   │   │       ├── __init__.py
│   │   │       ├── get_store.py
│   │   │       └── update_store.py
│   │   │
│   │   ├── ports/                      # Puertos (interfaces para infraestructura)
│   │   │   ├── __init__.py
│   │   │   ├── photo_storage.py        # Cloudinary / S3 abstraction
│   │   │   ├── queue_service.py        # Celery abstraction
│   │   │   ├── ocr_service.py          # OCR / AI abstraction
│   │   │   └── exchange_rate_provider.py
│   │   │
│   │   └── dto/                        # Data Transfer Objects (Pydantic)
│   │       ├── __init__.py
│   │       ├── product_dto.py
│   │       ├── sale_dto.py
│   │       ├── sync_dto.py
│   │       └── auth_dto.py
│   │
│   ├── infrastructure/                # CAPA INFRASTRUCTURE
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py              # SQLAlchemy async session
│   │   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   │   ├── __init__.py
│   │   │   │   ├── product_model.py
│   │   │   │   ├── sale_model.py
│   │   │   │   ├── store_model.py
│   │   │   │   ├── user_model.py
│   │   │   │   └── exchange_rate_model.py
│   │   │   ├── repositories/           # Implementaciones de repositorios
│   │   │   │   ├── __init__.py
│   │   │   │   ├── product_repository.py
│   │   │   │   ├── sale_repository.py
│   │   │   │   ├── store_repository.py
│   │   │   │   └── sync_repository.py
│   │   │   ├── alembic/                # Migraciones
│   │   │   │   ├── alembic.ini
│   │   │   │   ├── env.py
│   │   │   │   └── versions/
│   │   │   │       ├── 001_create_stores.py
│   │   │   │       ├── 002_create_products.py
│   │   │   │       ├── 003_create_sales.py
│   │   │   │       └── 004_create_exchange_rates.py
│   │   │   └── seed/
│   │   │       ├── __init__.py
│   │   │       └── seed_products.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── cloudinary/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── client.py
│   │   │   │   └── photo_storage.py    # Implementa PhotoStorage
│   │   │   ├── queue/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── celery_app.py       # Celery app definition
│   │   │   │   ├── tasks/              # Tareas asíncronas
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── photo_tasks.py  # OCR / AI processing
│   │   │   │   │   ├── sync_tasks.py   # Sync offline processing
│   │   │   │   │   └── notification_tasks.py
│   │   │   │   └── queue_service.py    # Implementa QueueService
│   │   │   ├── ocr/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── easy_ocr.py         # Implementa OCRService
│   │   │   │   ├── tesseract_ocr.py    # Fallback offline
│   │   │   │   └── classifier.py       # Clasificación de productos con ML
│   │   │   └── exchange_rate/
│   │   │       ├── __init__.py
│   │   │       └── bcb_provider.py     # Implementa ExchangeRateProvider
│   │   │
│   │   └── auth/
│   │       ├── __init__.py
│   │       └── supabase_auth.py        # Supabase Auth + JWT verification
│   │
│   ├── presentation/                  # CAPA PRESENTATION
│   │   ├── api/                        # FastAPI routers
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py           # Agrupa todos los routers v1
│   │   │   │   ├── products.py         # /api/v1/products
│   │   │   │   ├── sales.py            # /api/v1/sales
│   │   │   │   ├── photos.py           # /api/v1/photos
│   │   │   │   ├── sync.py             # /api/v1/sync
│   │   │   │   ├── auth.py             # /api/v1/auth
│   │   │   │   ├── store.py            # /api/v1/store
│   │   │   │   └── exchange_rates.py   # /api/v1/exchange-rates
│   │   │   │
│   │   │   └── webhooks/
│   │   │       ├── __init__.py
│   │   │       └── cloudinary.py       # Webhook de Cloudinary
│   │   │
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # Verificar JWT
│   │   │   ├── error_handler.py        # Error handling global
│   │   │   └── rate_limit.py           # Rate limiting
│   │   │
│   │   └── dependencies.py            # FastAPI dependency injection
│   │       # Ej: get_db(), get_current_user(), get_photo_storage()
│   │
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py                 # Pydantic Settings (env vars)
│   │   ├── supabase.py                 # Supabase client config
│   │   ├── cloudinary.py               # Cloudinary config
│   │   ├── redis.py                    # Redis / Celery config
│   │   └── database.py                 # SQLAlchemy engine config
│   │
│   └── main.py                         # FastAPI app entry point
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                     # Fixtures compartidas
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── domain/
│   │   │   ├── __init__.py
│   │   │   └── test_product.py
│   │   ├── application/
│   │   │   ├── __init__.py
│   │   │   └── test_create_product.py
│   │   └── infrastructure/
│   │       ├── __init__.py
│   │       └── test_product_repository.py
│   ├── integration/
│   │   ├── __init__.py
│   │   ├── test_products_api.py
│   │   ├── test_sales_api.py
│   │   └── test_sync.py
│   └── e2e/
│       ├── __init__.py
│       └── test_full_flow.py
│
├── pyproject.toml                      # Dependencias (Poetry)
├── Dockerfile
├── docker-compose.yml                  # FastAPI + Redis + Celery Worker
└── .env.example
```

### Reglas de dependencia (Clean Architecture):

```
┌──────────────────────────────────────────────────┐
│                  PRESENTATION                      │
│      (FastAPI Routers, Middleware, Dependencies)   │
│                                                    │
│   Depende de: Application  (orquesta casos de uso) │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│                  APPLICATION                       │
│       (Use Cases, Ports, DTOs / Pydantic)         │
│                                                    │
│   Depende de: Domain (interfaces de repositorio)   │
│   NO depende de: Infrastructure o Presentation     │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│                  INFRASTRUCTURE                    │
│   (SQLAlchemy, Cloudinary, Celery, Supabase)       │
│                                                    │
│   Implementa interfaces de Domain + ports de App   │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│                    DOMAIN                          │
│  (Entities, Value Objects, ABC Repositories)      │
│                                                    │
│   NO depende de nada externo                       │
│   Es el core puro del negocio                      │
└──────────────────────────────────────────────────┘
```

---

## 4. Diferencia clave con la versión Node.js: Queues con Celery

| Aspecto | Node.js (BullMQ) | Python (Celery) |
|---|---|---|
| **Librería** | BullMQ | Celery |
| **Backend** | Redis | Redis (o RabbitMQ) |
| **Workers** | Procesos separados | Procesos separados |
| **Task definition** | Clases en TypeScript | Funciones Python con decorador `@app.task` |
| **Retry** | `backoff: { type: 'exponential' }` | `max_retries + retry_backoff` |
| **Schedule** | `cron` vía QueueScheduler | `celery beat` |

**Ejemplo de tarea Celery:**

```python
# infrastructure/services/queue/tasks/photo_tasks.py
from celery import shared_task
from application.ports.ocr_service import OCRService
from infrastructure.services.ocr.easy_ocr import EasyOCRService
from infrastructure.database.session import SessionLocal

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=2,   # exponential backoff by default
    acks_late=True,           # re-ejecuta si el worker muere
)
def process_photo_task(self, photo_id: str, image_path: str):
    """Procesa una foto: OCR + clasificación + guardado."""
    try:
        ocr = EasyOCRService()
        result = ocr.extract_text(image_path)
        # guardar resultado, encolar siguiente paso
        return result
    except Exception as exc:
        raise self.retry(exc=exc)
```

**Colas definidas:**

```python
# infrastructure/services/queue/celery_app.py
from celery import Celery

celery_app = Celery("inventory", broker="redis://redis:6379/0")

celery_app.conf.task_routes = {
    "photo_tasks.*": {"queue": "photo-processing"},
    "sync_tasks.*": {"queue": "sync-offline"},
    "notification_tasks.*": {"queue": "notifications"},
}

# Schedule para celery beat (tareas periódicas)
celery_app.conf.beat_schedule = {
    "sync-every-5-minutes": {
        "task": "sync_tasks.process_sync_queue",
        "schedule": 300.0,  # cada 5 minutos
    },
}
```

---

## 5. Mobile App — React Native + Expo (`apps/mobile/`)

```
apps/mobile/
│
├── app/                                # Expo Router (file-based routing)
│   ├── _layout.tsx                     # Root layout (providers)
│   ├── index.tsx                       # Entry → redirect
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (main)/
│   │   ├── _layout.tsx                 # Bottom tab navigator
│   │   ├── dashboard/
│   │   │   └── index.tsx
│   │   ├── products/
│   │   │   ├── index.tsx               # Lista
│   │   │   ├── new.tsx                 # Crear
│   │   │   └── [id]/
│   │   │       ├── index.tsx           # Detalle
│   │   │       └── edit.tsx            # Editar
│   │   ├── sales/
│   │   │   ├── index.tsx               # Historial
│   │   │   └── [id]/
│   │   │       └── index.tsx           # Detalle
│   │   └── settings/
│   │       └── index.tsx
│   │
│   ├── pos/
│   │   ├── index.tsx                   # POS principal
│   │   └── scanner.tsx                 # Escáner QR
│   │
│   └── qr/
│       └── [id].tsx                    # QR a pantalla completa
│
├── src/
│   ├── components/
│   │   ├── ui/                         # Design system
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductPhoto.tsx
│   │   │   └── StockBadge.tsx
│   │   │
│   │   ├── sale/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   ├── PaymentMethodPill.tsx
│   │   │   └── SaleSuccess.tsx
│   │   │
│   │   ├── sync/
│   │   │   ├── SyncBanner.tsx
│   │   │   └── SyncIndicator.tsx
│   │   │
│   │   └── shared/
│   │       ├── Header.tsx
│   │       ├── SearchBar.tsx
│   │       ├── LoadingOverlay.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── useAuth.ts
│   │   │   ├── AuthProvider.tsx
│   │   │   └── auth.service.ts
│   │   ├── products/
│   │   │   ├── useProducts.ts
│   │   │   ├── useProductSearch.ts
│   │   │   └── products.service.ts
│   │   ├── sales/
│   │   │   ├── useSales.ts
│   │   │   ├── useCart.ts
│   │   │   └── sales.service.ts
│   │   ├── sync/
│   │   │   ├── useSync.ts
│   │   │   ├── SyncProvider.tsx
│   │   │   └── sync.service.ts
│   │   └── camera/
│   │       ├── useCamera.ts
│   │       └── camera.service.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts               # Axios / fetch client
│   │   │   ├── generated/              # ← Generado por orval desde OpenAPI
│   │   │   │   ├── types.ts             # Tipos de Product, Sale, etc.
│   │   │   │   ├── products.ts          # Hooks + client de productos
│   │   │   │   ├── sales.ts
│   │   │   │   └── sync.ts
│   │   │   ├── products.api.ts
│   │   │   ├── sales.api.ts
│   │   │   ├── sync.api.ts
│   │   │   └── photos.api.ts
│   │   │
│   │   ├── database/                   # WatermelonDB
│   │   │   ├── database.ts
│   │   │   ├── schema.ts
│   │   │   ├── models/
│   │   │   │   ├── Product.ts
│   │   │   │   ├── Sale.ts
│   │   │   │   └── SyncQueue.ts
│   │   │   ├── sync.ts                 # Sync engine (push/pull)
│   │   │   └── migrations.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── secure-store.ts
│   │   │   └── file-system.ts
│   │   │
│   │   └── network/
│   │       └── netinfo.ts
│   │
│   ├── hooks/
│   │   ├── useNetworkStatus.ts
│   │   ├── useDebounce.ts
│   │   └── useCamera.ts
│   │
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── SyncProvider.tsx
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── navigation.ts
│   │   └── env.d.ts
│   │
│   └── utils/
│       ├── formatters.ts
│       ├── validators.ts
│       └── haptics.ts
│
├── assets/
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── tailwind.config.js                  # NativeWind
```

### Principio de organización mobile:

```
Pantalla (app/*.tsx)
    └── usa componentes (components/*)
    └── usa hooks de features (features/*/use*.ts)
    └── llama servicios (services/api/*)
    └── datos vienen de WatermelonDB (services/database/)
    └── tipos generados desde OpenAPI del backend (services/api/generated/)
```

---

## 6. Web App — Next.js App Router (`apps/web/`)

```
apps/web/
│
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root layout
│   ├── page.tsx                        # Landing / Login redirect
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Sidebar + header
│   │   ├── page.tsx                    # Dashboard
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── sales/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   └── api/                            # Solo proxy al backend Python
│       └── [...path]/
│           └── route.ts
│
├── src/
│   ├── components/
│   │   ├── ui/                         # shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   └── badge.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── NavLinks.tsx
│   │   ├── products/
│   │   │   ├── ProductTable.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductFilters.tsx
│   │   │   └── ProductPhotoUpload.tsx
│   │   ├── sales/
│   │   │   ├── SalesTable.tsx
│   │   │   └── SaleDetail.tsx
│   │   └── reports/
│   │       ├── SalesChart.tsx
│   │       ├── TopProductsTable.tsx
│   │       └── MetricsCards.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── useAuth.ts
│   │   │   └── AuthProvider.tsx
│   │   ├── products/
│   │   │   ├── useProducts.ts
│   │   │   └── products.service.ts
│   │   ├── sales/
│   │   │   ├── useSales.ts
│   │   │   └── sales.service.ts
│   │   └── reports/
│   │       ├── useDashboard.ts
│   │       └── reports.service.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts               # API client (server-side)
│   │   │   ├── client-browser.ts       # API client (browser-side)
│   │   │   └── generated/              # ← Generado por orval desde OpenAPI
│   │   │       ├── types.ts
│   │   │       ├── products.ts
│   │   │       ├── sales.ts
│   │   │       └── sync.ts
│   │   └── database/                   # IndexedDB (Dexie.js)
│   │       ├── database.ts
│   │       ├── schema.ts
│   │       └── sync.ts
│   │
│   ├── hooks/
│   │   ├── useNetworkStatus.ts
│   │   └── useDebounce.ts
│   │
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   └── ThemeProvider.tsx
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   └── index.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
│
├── public/
│   ├── logo.svg
│   └── icons/
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.js
└── .env.example
```

---

## 7. Flujo OpenAPI → TypeScript (tipos compartidos)

```
FastAPI (Python)
    │
    ├── Genera /openapi.json automáticamente
    │
    ├── orval / openapi-typescript (en mobile y web)
    │
    ├── Genera:
    │   ├── services/api/generated/types.ts      ← Interfaces TypeScript
    │   ├── services/api/generated/products.ts    ← Hooks + client
    │   └── services/api/generated/sales.ts       ← Hooks + client
    │
    └── Los frontends usan estos tipos y clientes
```

**Comando para generar tipos (se ejecuta en mobile/ y web/):**

```bash
# Instalar orval
npm install orval -D

# Configurar orval.config.ts apuntando a http://localhost:8000/openapi.json
npx orval

# Resultado: src/services/api/generated/*.ts con tipos y clientes actualizados
```

**Ejemplo del flujo concreto:**

```python
# backend/src/presentation/api/v1/products.py
from fastapi import APIRouter
from pydantic import BaseModel

class ProductResponse(BaseModel):
    id: str
    name: str
    price: float
    stock: int

router = APIRouter()

@router.get("/products", response_model=list[ProductResponse])
async def list_products():
    ...
```

Esto genera automáticamente en el frontend:

```typescript
// web/src/services/api/generated/types.ts
export interface ProductResponse {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// web/src/services/api/generated/products.ts
export const getProducts = () => fetcher<ProductResponse[]>('/products');
```

---

## 8. Arquitectura de Deployment

```
┌─────────────────────────────────────────────────┐
│                   Clientes                        │
│                                                   │
│   React Native App (Expo)      Web App (Next.js) │
│         (Mobile)                    (PC/Tablet)   │
└─────────────────────┬───────────────────┬─────────┘
                      │                   │
                      │  HTTPS / REST     │  HTTPS
                      │  + WebSocket      │
                      ▼                   ▼
┌─────────────────────────────────────────────────────┐
│               API Gateway / Proxy                    │
│               Next.js (apps/web)                     │
│               Solo proxy → backend                   │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│               FastAPI Server (Python)                │
│               apps/backend/src/main.py               │
│                                                      │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────┐ │
│   │ Routers  │  │ Use Cases    │  │ Domain       │ │
│   └──────────┘  └──────────────┘  └──────────────┘ │
└──────────┬──────────────────┬───────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────────────────┐
│   Supabase       │  │   Redis + Celery Workers     │
│   PostgreSQL     │  │                              │
│   + Auth         │  │   ┌──────────────────────┐   │
│   + Realtime     │  │   │ photo-processing     │   │
│                  │  │   │ (EasyOCR + scikit)   │   │
│   Cloudinary     │  │   ├──────────────────────┤   │
│   (Storage)      │  │   │ sync-offline         │   │
│                  │  │   │ (push/pull)          │   │
│                  │  │   ├──────────────────────┤   │
│                  │  │   │ notifications        │   │
│                  │  │   └──────────────────────┘   │
└──────────────────┘  └──────────────────────────────┘
```

---

## 9. Sección crítica: OCR / AI (Python)

Python se vuelve especialmente ventajoso aquí frente a Node.js:

| Servicio | Librería | Propósito |
|---|---|---|
| **OCR** | EasyOCR o PaddleOCR | Extraer texto de fotos de cuadernos |
| **Preprocesamiento** | Pillow + OpenCV | Mejorar calidad de imagen para OCR |
| **Clasificación** | scikit-learn | Clasificar producto en categoría |
| **NLP** | spaCy | Estructurar texto extraído → JSON |
| **Server** | Celery | Tarea asíncrona, no bloquea la API |

```python
# infrastructure/services/ocr/easy_ocr.py
import easyocr
from PIL import Image
from application.ports.ocr_service import OCRResult

class EasyOCRService:
    def __init__(self):
        self.reader = easyocr.Reader(['es'], gpu=False)

    def extract_from_photo(self, image_path: str) -> OCRResult:
        """Extrae texto de una foto de cuaderno."""
        result = self.reader.readtext(image_path)
        raw_text = " ".join([text for _, text, conf in result if conf > 0.5])
        return self._structure_text(raw_text)

    def _structure_text(self, text: str) -> OCRResult:
        """Convierte texto plano a JSON estructurado."""
        # "arroz 10bs 20und" → { name: "arroz", price: 10, stock: 20 }
        ...
```

---

## 10. Resumen de estructura

```
inventory-app/
│
├── apps/
│   ├── backend/        ← Python + FastAPI + Clean Architecture
│   ├── mobile/         ← React Native + Expo (Feature-first)
│   └── web/            ← Next.js App Router (Feature-first)
│
├── docs/
├── .github/workflows/
└── scripts/            ← keepalive.py, seed.py
```

| Carpeta | Arquitectura | Lenguaje | Framework |
|---|---|---|---|
| `apps/backend` | Clean Architecture (Domain → App → Infra → Presentation) | **Python 3.12+** | **FastAPI** |
| `apps/mobile` | Feature-first + Expo Router | TypeScript | React Native + Expo |
| `apps/web` | Feature-first + App Router | TypeScript | React + Next.js |

### Tipos compartidos entre backend y frontends

Se generan automáticamente desde el OpenAPI de FastAPI hacia TypeScript con **orval** o **openapi-typescript**. No hay un `packages/shared` manual — los tipos siempre están sincronizados porque nacen del backend.
