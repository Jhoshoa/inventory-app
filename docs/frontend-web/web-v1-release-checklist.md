# Web V1 Release Checklist

Fecha: 2026-05-21

## Environment

Required:

```text
BACKEND_API_URL=https://api.example.com
NEXT_PUBLIC_APP_NAME=Inventory App
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Optional:

```text
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
```

## Local Release Validation

From `apps/web`:

```powershell
corepack pnpm clean
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

## Manual Smoke

- `/login` loads.
- Unauthenticated `/dashboard` redirects to `/login`.
- Authenticated `/dashboard` loads.
- Products list and create form load.
- POS search/cart loads.
- Sales list/detail loads.
- Reports and exports permissions render.
- Imports list/upload/review route loads.
- Unknown dashboard route shows not-found UI.

## Release Notes

- Keep `.next` out of cache restore for release builds unless the cache key includes lockfile and Next version.
- Web is online-first for V1. Network failures must show clear retry/error states.
- Do not expose access tokens to browser storage.
