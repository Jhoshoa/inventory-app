# Inventory App — Backend API

Python FastAPI backend con Clean Architecture para la gestión de inventario offline-first.

## Stack

| Componente | Tecnología |
|---|---|
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2.0 (async) |
| DB | PostgreSQL (Supabase) |
| Migraciones | Alembic |
| Auth | Supabase Auth (JWT) |
| Colas | Celery + Redis |
| OCR | EasyOCR |
| Storage | Cloudinary |

## Requisitos

- Python 3.12+
- PostgreSQL (o Supabase)
- Redis (para Celery)

## Setup

```bash
# 1. Clonar el repo y entrar al backend
cd apps/backend

# 2. Crear entorno virtual
python -m venv .venv

# 3. Activar (Windows)
.venv\Scripts\activate

# 4. Activar (Linux/macOS)
# source .venv/bin/activate

# 5. Instalar dependencias
# Producción
pip install -e .

# Desarrollo (incluye pytest, ruff, mypy)
pip install -e ".[dev]"

# QA (incluye dev + pytest-cov)
pip install -e ".[dev,qa]"

# Producción en servidor (con gunicorn)
pip install -e ".[prod]"

# 6. Copiar y configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales (Supabase, Cloudinary, Redis)

# 7. Ejecutar migraciones
alembic upgrade head

# 8. Iniciar servidor
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## Comandos útiles

```bash
# Servidor de desarrollo
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Servidor de producción
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4

# Tests
pytest tests/ -v

# Linter
ruff check src/

# Type checker
mypy src/

# Migraciones
alembic revision --autogenerate -m "descripcion"
alembic upgrade head

# Celery worker
celery -A src.infrastructure.services.queue.celery_app worker --loglevel=info

# Celery beat (tareas programadas)
celery -A src.infrastructure.services.queue.celery_app beat --loglevel=info
```

## Estructura

```
src/
├── config/          # Configuración (Pydantic Settings)
├── domain/          # Entidades, Value Objects, Interfaces
├── application/     # Casos de uso, Puertos, DTOs
├── infrastructure/  # SQLAlchemy, Celery, Cloudinary, OCR, Auth
├── presentation/    # FastAPI routers, middleware, DI
└── main.py          # Entry point
```

## API Docs

Una vez iniciado el servidor:

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json
