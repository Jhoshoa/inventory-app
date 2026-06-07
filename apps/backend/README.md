# Inventory App - Backend API

FastAPI backend for the offline-first inventory app. The backend follows a Clean Architecture layout and exposes the MVP API used by the web and mobile apps.

## Stack

| Area | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2.0 async |
| DB | PostgreSQL/Supabase in production, SQLite-compatible test setup |
| Migrations | Alembic |
| Auth | Supabase Auth, with DEBUG dev-login support |
| Jobs | Celery + Redis |
| Storage | Cloudinary, with local no-op behavior when credentials are placeholders |
| Tests | pytest + pytest-asyncio + httpx ASGITransport |
| Lint | Ruff |

## Current API Coverage

Implemented endpoint groups:

- `auth`: login, register, refresh, dev-login
- `products`: create, list, get, update, delete, stock adjustment
- `sales`: create, list, get, stock reduction on sale
- `store`: get and update current store
- `exchange-rates`: upsert and list rates
- `sync`: push/pull product changes and pull sale updates

## Setup

```bash
cd apps/backend

# Create and activate a virtual environment
py -m venv .venv
.venv\Scripts\activate

# Install runtime dependencies
py -m pip install -e .

# Install development dependencies
py -m pip install -e .[dev]
```

The app has local defaults in `src/config/settings.py`, so it can import and run tests without real Supabase or Cloudinary credentials. For real environments, create `.env` and provide:

```env
DEBUG=false
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/postgres
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=...
SENTRY_DSN=
```

## Run

```bash
py -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

API docs:

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

## Verify

Run endpoint and unit tests:

```bash
py -m pytest tests -q -p no:cacheprovider
```

Run lint:

```bash
py -m ruff check src tests --no-cache
```

Current verified result:

- `12 passed`
- `All checks passed`

Note: `py -m mypy src` currently hits a mypy 2.1.0 internal error in this local environment, so Ruff and pytest are the reliable checks right now.

## Migrations

```bash
py -m alembic upgrade head
py -m alembic revision --autogenerate -m "description"
```

The initial migration creates stores, products, sales, sale_items, users, and exchange_rates with the MVP foreign keys and indexes.

## Seed Data

For local/manual testing, run migrations first and then seed deterministic demo data:

```bash
py -m alembic upgrade head
py -m src.infrastructure.database.seed.dev_seed
```

The seed creates:

- Store: `00000000-0000-0000-0000-000000000101`
- User: `dev@local.dev`
- Products:
  - `11111111-1111-1111-1111-111111111111` - Arroz 1kg
  - `22222222-2222-2222-2222-222222222222` - Aceite 1l
  - `33333333-3333-3333-3333-333333333333` - Fideo 400g
- Exchange rates for `bcb` and `paralelo`

The script is idempotent, so it is safe to run more than once in local development.

## Workers

```bash
py -m celery -A src.infrastructure.services.queue.celery_app worker --loglevel=info
py -m celery -A src.infrastructure.services.queue.celery_app beat --loglevel=info
```

## Structure

```text
src/
|-- config/          # Pydantic settings and service config
|-- domain/          # Entities, value objects, repository interfaces
|-- application/     # Use cases, DTOs, ports, application exceptions
|-- infrastructure/  # SQLAlchemy models/repos, Celery, Cloudinary, auth
|-- presentation/    # FastAPI routers, dependencies, middleware
`-- main.py          # FastAPI app entry point
```
