# Sprint 6 V1 Release Hardening Plan

Fecha: 2026-05-19

## Objetivo

Preparar el backend para una v1 operable: health checks, configuracion validada, CI confiable, errores consistentes, observabilidad minima y contratos estables para web/mobile. Sprints 1-5 dejaron las capacidades centrales listas; Sprint 6 debe reducir riesgo operativo antes de agregar mas features.

## Principios

- No agregar funcionalidad grande si el release todavia no es verificable.
- La API debe poder decir si esta viva, lista y conectada a dependencias criticas.
- CI debe ejecutar lo mismo que usamos localmente: lint, tests y migraciones.
- Los errores deben tener formato estable y no filtrar detalles sensibles en produccion.
- Observabilidad minima: request id, tiempos, status code y errores.
- Mantener compatibilidad con desarrollo local simple.

## Estado Actual

### Ya existe

- FastAPI con routers versionados bajo `/api/v1`.
- Error handler centralizado.
- Settings por `.env` y `.env.example`.
- Sentry opcional.
- Docker Compose con Postgres y Redis.
- Alembic validado hasta `007`.
- Tests backend: unit/integration.
- Daily keepalive deshabilitado y manual.

### Falta

- Endpoints `/health/live` y `/health/ready`.
- Verificacion de DB/Redis desde readiness.
- Middleware de request id y logging estructurado.
- Configuracion que falle temprano si produccion usa valores inseguros.
- CI actualizado al toolchain real del backend.
- CI con Postgres y `alembic upgrade head`.
- OpenAPI exportable para clientes.
- Error responses con `request_id`.
- Tests de health, config y error contract.

## Alcance Incluido

- Agregar router `health`.
- Agregar middleware de request id.
- Agregar logging JSON/simple estable.
- Endurecer `Settings` con validaciones para produccion.
- Actualizar `.env.example`.
- Actualizar `ci-backend.yml`.
- Agregar script o comando documentado para exportar OpenAPI.
- Agregar tests de health, error contract y settings.
- Agregar validacion de Alembic en CI contra Postgres.

## Fuera de Alcance

- Monitoreo completo con Prometheus/Grafana.
- Rate limiting distribuido.
- Background jobs reales para OCR.
- Backup automatizado de produccion.
- Infraestructura cloud final.
- Cambios de modelo de negocio.

## API Propuesta

### Liveness

```http
GET /health/live
```

Respuesta:

```json
{
  "status": "ok",
  "app": "Inventory API",
  "version": "0.1.0"
}
```

Reglas:

- No toca DB ni servicios externos.
- Debe responder rapido aunque Postgres este caido.
- Usado por load balancers o contenedores.

### Readiness

```http
GET /health/ready
```

Respuesta OK:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

Respuesta degradada:

```json
{
  "status": "not_ready",
  "checks": {
    "database": "ok",
    "redis": "unavailable"
  }
}
```

Reglas:

- DB es dependencia critica.
- Redis puede ser `optional` para v1 si OCR background no es obligatorio.
- Timeout corto por dependencia.
- No requiere autenticacion.

## Configuracion

Agregar settings:

- `ENVIRONMENT`: `local`, `test`, `staging`, `production`.
- `APP_VERSION`: default `0.1.0`.
- `LOG_LEVEL`: default `INFO`.
- `REQUIRE_REDIS_READY`: default `false`.
- `EXPOSE_ERROR_DETAILS`: default `false` en no-debug.

Validaciones:

- Si `ENVIRONMENT=production`, `DEBUG` debe ser `false`.
- Si produccion, `DATABASE_URL` no puede ser SQLite.
- Si produccion, `CORS_ALLOWED_ORIGINS` no puede contener `*`.
- Si produccion, secrets no pueden usar valores placeholder.
- `SENTRY_DSN` opcional, pero recomendado en staging/production.

## Error Contract

Formato recomendado:

```json
{
  "error": "not_found",
  "detail": "Producto no encontrado",
  "request_id": "uuid"
}
```

Reglas:

- Todos los handlers incluyen `request_id`.
- En produccion, excepciones inesperadas devuelven mensaje generico.
- En debug, pueden incluir detalle tecnico.
- Mantener codigos existentes: `application_error`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `invalid_data`.

## Middleware de Request ID

Reglas:

- Leer `X-Request-ID` si viene.
- Si no viene, generar UUID.
- Agregar header `X-Request-ID` en respuesta.
- Guardar en `request.state.request_id`.
- Logs por request: method, path, status, duration_ms, request_id.

## CI Backend

Problema actual:

- `ci-backend.yml` instala Poetry, pero el backend no depende de Poetry como flujo oficial.
- CI no levanta Postgres ni valida Alembic.
- CI no corre Ruff contra `tests`.

Pipeline propuesto:

1. Checkout.
2. Setup Python 3.12.
3. Instalar backend:

```bash
python -m pip install -e ".[dev]"
```

4. Levantar Postgres service en GitHub Actions.
5. Exportar `DATABASE_URL`.
6. Ejecutar:

```bash
python -m ruff check src tests --no-cache
python -m pytest tests -q -p no:cacheprovider
python -m alembic upgrade head
python -m alembic current
```

7. Exportar OpenAPI:

```bash
python -m scripts.export_openapi
```

## OpenAPI

Agregar script:

```text
apps/backend/scripts/export_openapi.py
```

Salida:

```text
apps/backend/openapi.json
```

Uso:

```powershell
cd apps/backend
python -m scripts.export_openapi
```

Reglas:

- No commitear `openapi.json` inicialmente si cambia mucho.
- Usarlo como artefacto de CI o para generar clientes web/mobile.

## Docker Compose

Agregar healthcheck al servicio `api` despues de crear `/health/live`.

Ejemplo:

```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')"]
  interval: 10s
  timeout: 3s
  retries: 5
```

Mantener `db` y `redis` como servicios separados.

## Tests Requeridos

### Health

1. `test_liveness_returns_ok_without_auth`
2. `test_readiness_returns_ready_when_db_available`
3. `test_readiness_does_not_require_auth`

### Request ID y errores

4. `test_request_id_header_is_returned`
5. `test_existing_request_id_is_preserved`
6. `test_application_error_includes_request_id`
7. `test_unexpected_error_hides_detail_when_not_debug`

### Config

8. `test_production_rejects_debug_true`
9. `test_production_rejects_sqlite_database`
10. `test_production_rejects_wildcard_cors`

### CI/migrations

11. CI ejecuta `alembic upgrade head` contra Postgres.
12. CI ejecuta Ruff en `src tests`.

## Archivos a Tocar

- `apps/backend/src/main.py`
- `apps/backend/src/config/settings.py`
- `apps/backend/src/presentation/api/health.py`
- `apps/backend/src/presentation/middleware/error_handler.py`
- `apps/backend/src/presentation/middleware/request_context.py`
- `apps/backend/scripts/export_openapi.py`
- `apps/backend/docker-compose.yml`
- `apps/backend/.env.example`
- `.github/workflows/ci-backend.yml`
- `apps/backend/tests/integration/test_health.py`
- `apps/backend/tests/integration/test_error_contract.py`
- `apps/backend/tests/unit/config/test_settings.py`

## Validaciones Manuales

```powershell
cd apps/backend
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
python -m alembic upgrade head
python -m alembic current
python -m scripts.export_openapi
```

Con servidor local:

```powershell
python -m uvicorn src.main:app --reload
```

Probar:

- `GET http://localhost:8000/health/live`
- `GET http://localhost:8000/health/ready`
- Verificar header `X-Request-ID`.

## Criterios de Aceptacion

- Liveness responde sin depender de DB.
- Readiness valida DB y reporta Redis segun configuracion.
- Toda respuesta de error incluye `request_id`.
- Logs incluyen request id, status y duracion.
- Settings fallan temprano con configuracion insegura en produccion.
- CI usa el toolchain real del backend.
- CI valida tests, Ruff y Alembic contra Postgres.
- OpenAPI puede exportarse en un comando.
- Docker Compose puede healthcheckear la API.

## Riesgos y Decisiones

- **Redis opcional:** para v1 no debe bloquear deploy si background OCR no es obligatorio. Usar `REQUIRE_REDIS_READY=false`.
- **Error details:** en debug ayudan; en produccion deben ocultarse.
- **CI con SQLite + Postgres:** tests pueden seguir usando SQLite, pero migraciones deben validarse en Postgres.
- **OpenAPI cambiante:** exportar como artefacto inicialmente evita ruido en commits.
- **Logging JSON:** si resulta demasiado pesado, iniciar con logs key-value simples.

## Resultado Esperado

Al cerrar Sprint 6, el backend estara listo para ser consumido con mas confianza por web/mobile: se puede monitorear, desplegar, validar migraciones, diagnosticar errores con request id y evitar configuraciones inseguras en produccion. Esto deja la v1 backend cerca de release candidate.
