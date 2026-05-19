# Repository Guidelines

## Project Structure & Module Organization

This repository is a monorepo for an offline-first inventory app.

- `apps/backend/`: FastAPI backend using Clean Architecture. Source lives in `src/`, tests in `tests/`, migrations in `src/infrastructure/database/alembic/`, and request examples in `examples/requests/`.
- `apps/web/`: Next.js web app.
- `apps/mobile/`: Expo React Native mobile app.
- `docs/`: planning, architecture notes, and implementation analysis.
- `scripts/`: standalone automation scripts, including the Supabase keepalive/rates script.
- `.github/workflows/`: CI and optional automation workflows.

## Build, Test, and Development Commands

Backend:

```bash
cd apps/backend
py -m pip install -e .[dev]
py -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
py -m pytest tests -q -p no:cacheprovider
py -m ruff check src tests --no-cache
py -m alembic upgrade head
```

Web:

```bash
cd apps/web
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

Mobile:

```bash
cd apps/mobile
pnpm install
pnpm start
pnpm typecheck
```

## Coding Style & Naming Conventions

Use Python 3.12+ for backend code. Keep backend modules aligned with the existing layers: `domain`, `application`, `infrastructure`, and `presentation`. Use snake_case for Python files/functions and PascalCase for classes. Run Ruff before submitting backend changes.

Use TypeScript for web and mobile. Prefer feature-oriented files and React component names in PascalCase. Keep environment-specific values out of source code.

## Testing Guidelines

Backend tests use `pytest` and `pytest-asyncio`; test files should be named `test_*.py`. Place integration tests under `apps/backend/tests/integration/` and focused unit tests under `apps/backend/tests/unit/`. Add or update tests when changing API behavior, persistence, sync, sales, products, or auth flows.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits, for example `feat(backend): ...`, `docs: ...`, and `fix: ...`. Use concise, imperative messages and add a scope when helpful.

Pull requests should include a short summary, verification commands run, linked issue/task when applicable, and screenshots for UI changes. Mention migrations, new environment variables, or workflow changes explicitly.

## Security & Configuration Tips

Do not commit secrets. Backend runtime configuration belongs in `.env` files or platform secrets. GitHub Actions secrets used by workflows include Supabase credentials; keep scheduled workflows disabled unless the automation is intentional and idempotent.
