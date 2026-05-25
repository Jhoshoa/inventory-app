# Inventory Web

Next.js frontend for the offline-first inventory app.

## Prerequisites

- Node.js with Corepack enabled
- Backend running at `http://localhost:8000`
- Backend dependencies installed in its Python virtual environment

## Install Dependencies

From this folder:

```bash
cd apps/web
corepack pnpm install
```

## Environment

Create a local `.env` from the example file:

```bash
cd apps/web
copy .env.example .env
```

Default local values:

```env
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Inventory App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
```

## Run backend Development
```bash
cd .\apps\backend\
.\.venv\Scripts\activate
py -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload 
```

## Run in Development frontend

```bash
cd apps/web
corepack pnpm dev
```

Open:

```text
http://localhost:3000
```

## Run in Production Mode

Production mode requires a build first. If you run `pnpm start` without this step, Next.js will fail with a missing `.next/BUILD_ID` error.

```bash
cd apps/web
corepack pnpm build
corepack pnpm start
```

## Useful Commands

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
```

Generate API types from the local backend OpenAPI schema:

```bash
corepack pnpm openapi:types
```

## Local Login

For local development, the backend must run with `DEBUG=true`. In that mode, `POST /api/v1/auth/login` returns a development session and ensures a local user exists.

Use:

```text
Email: dev@local.dev
Password: secret123
```

Cashier login credentials
```text
Email: cashier@local.dev
Password: password123
```

Note: in `DEBUG=true`, the backend does not validate the password against a stored hash, but the web login form requires at least 6 characters.

## Seed Data

The backend includes deterministic local seed data. Run migrations first, then seed from `apps/backend` using the backend virtual environment:

```bash
cd apps/backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m src.infrastructure.database.seed.dev_seed
```

and if you actually are inside the virtual environment, use this command to run the seed
```bash
cd apps/backend
py -m src.infrastructure.database.seed.dev_seed
```

The seed is idempotent and creates:

- Store: `Mi Tienda Demo`
- User: `dev@local.dev`
- Products:
  - `Arroz 1kg` with SKU `ARR-001` and QR `DEMO-ARR-001`
  - `Aceite 1l` with SKU `ACE-001` and QR `DEMO-ACE-001`
  - `Fideo 400g` with SKU `FID-001` and QR `DEMO-FID-001`
- Exchange rates for `bcb` and `paralelo`
