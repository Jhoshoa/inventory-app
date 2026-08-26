# Endurecimiento Final: Rate Limiting, Bugs Conocidos y Cobertura de Tests

Fecha: 2026-08-25

## Objetivo

Cerrar los gaps de robustez operativa que quedan antes de escalar trafico real: sin esto, el sistema es funcional pero fragil ante abuso, tiendas suspendidas que no deberian tener acceso, y regresiones silenciosas en el area mas sensible del negocio (facturacion).

## Por que va al final del roadmap

No es la mas urgente para conseguir el primer cliente (eso lo resuelven los documentos 01 y 02), pero es la que mas duele si se salta cuando el volumen de tiendas crece: rate limiting evita que un solo cliente (o un bot) tumbe el servicio para todos, y los tests de billing evitan que un bug en produccion le cobre mal (o no le cobre) a un cliente real.

## Estado Actual (verificado en codigo y con `pytest`)

- **Sin rate limiting en absoluto**: no hay `slowapi` ni libreria equivalente en las dependencias del backend. Todos los endpoints, incluyendo login y los que se agreguen en el documento 02 (webhooks, checkout), estan sin limite de requests.
- **Bug conocido y documentado**: `apps/backend/src/infrastructure/database/store_repository.py` linea ~51 filtra por `is_active=True` en vez de `access_status='active'`. Una tienda con `access_status='suspended'` (por trial vencido o falta de pago) podria seguir pasando este check si su `is_active` sigue en `true`. Ya esta anotado en `docs/clientes-suscriptores/implementacion-pendiente-y-pagos.md` seccion 5 como "Requiere decision", pero no se ha corregido.
- **`ArchiveStoresUseCase` no existe**: el ciclo de vida de retencion de datos (tienda suspendida → archivada → purgada a los 90/365 dias) mencionado en la documentacion de billing no tiene implementacion.
- **Suite de tests**: 127 passing / 1 failing al momento de esta auditoria (`apps/backend/tests`). El test que falla (`tests/integration/test_sprint7_sales_stock_exports.py::test_list_sales_defaults_to_calendar_today...`) hardcodea una fecha esperada en vez de mockear "hoy", por lo que se rompe cada dia que pasa — es un problema de higiene de tests, no un bug de producto.
- **Cero tests de billing/suscripcion/webhooks**: no existe `test_billing*.py` ni cobertura de los escenarios de bloqueo de acceso por estado de suscripcion. Esto es especialmente riesgoso porque el documento 02 va a agregar logica nueva (scheduler, webhooks) justo en esta area sin tests previos que la protejan.

## Alcance Incluido

### 1. Rate limiting

- Agregar `slowapi` (o equivalente) al backend.
- Limites recomendados como punto de partida (ajustar con datos reales de uso despues):
  - Login/registro: 5-10 req/min por IP.
  - Endpoints publicos nuevos del documento 01 (formulario de contacto): 3-5 req/min por IP.
  - Webhooks del documento 02: sin rate limit por IP (viene del proveedor de pago), pero si con validacion de firma obligatoria.
  - Aceptar invitacion (documento 03): 5-10 req/min por IP, ya anotado como pendiente en ese plan.
  - Resto de la API autenticada: limite generoso (ej. 100-300 req/min por usuario) solo como red de seguridad, no para limitar uso normal.
- Documentar los limites en `.env.example` como configurables, no hardcodeados.

### 2. Corregir bug de `is_active` vs `access_status`

- Decidir la regla definitiva: lo mas seguro es que **ambas condiciones importen** — un usuario no deberia poder operar si su tienda esta `is_active=false` O `access_status != 'active'`. Implementar el check combinado en el punto central donde se resuelve el contexto de tienda (`GetCurrentUserContextUseCase` u equivalente), no solo en `store_repository.get_by_id`.
- Agregar el test que falta (`test_suspended_store_cannot_login_regardless_of_is_active_flag`, ya listado en el documento 02) para que esto no vuelva a regresar.

### 3. Ciclo de vida de archivado de datos

- Implementar `ArchiveStoresUseCase`: tiendas con `access_status='suspended'` por mas de N dias (definir N con negocio, la documentacion existente menciona 90/365 dias en dos etapas) pasan a un estado `archived` que oculta la tienda de listados operativos pero no borra datos.
- Job de purga definitiva (borrado real) solo despues de un periodo mucho mas largo, y como accion manual/con confirmacion explicita al inicio — no automatizar el borrado permanente sin que un humano lo apruebe, dado el riesgo de perder datos de un cliente que solo se atraso en pagar.

### 4. Cobertura de tests en areas riesgosas

- Arreglar el test fragil de fecha hardcodeada (mockear "hoy" en vez de hardcodear un valor).
- Agregar la suite de tests de billing/webhooks especificada en el documento 02 (10 tests listados ahi).
- Agregar tests de rate limiting (verificar que el limite se aplica y que devuelve `429` con mensaje claro).
- Revisar cobertura de los flujos de sync (documento 04) una vez implementados: idempotencia y resolucion de conflictos son candidatos a bugs silenciosos costosos.

### 5. Verificacion de CI (pendiente de confirmar, no verificado en esta auditoria)

- El plan `docs/backend-enhancement/sprint-6-v1-release-hardening-plan.md` establecia que CI debia correr Postgres + `alembic upgrade head` + Ruff + pytest. Confirmar que `.github/workflows/ci-backend.yml` sigue reflejando esto (no se releyo en esta auditoria) y que el script `scripts/export_openapi.py` sigue funcionando, antes de dar por cerrado este plan.

## Fuera de Alcance

- Rate limiting distribuido (Redis-backed) — un rate limit en memoria por proceso es suficiente mientras haya una sola instancia del backend corriendo; revisar si se necesita cuando se escale a multiples instancias/replicas.
- Monitoreo completo con Prometheus/Grafana (ya estaba fuera de alcance en el sprint 6 original, se mantiene igual).
- Backup automatizado de produccion (deberia planificarse por separado, es mas una decision de infraestructura/hosting que de codigo de aplicacion — conectar con la decision de hosting del documento 01).

## Archivos a Tocar

- `apps/backend/pyproject.toml` (agregar `slowapi`)
- `apps/backend/src/main.py` (configurar limiter global)
- `apps/backend/src/presentation/api/v1/auth.py` (rate limit en login/registro)
- `apps/backend/src/presentation/middleware/` (o donde corresponda el limiter)
- `apps/backend/src/application/use_cases/auth/get_current_user_context.py` (o el use case equivalente — check combinado `is_active` + `access_status`)
- `apps/backend/src/infrastructure/database/store_repository.py`
- `apps/backend/src/application/use_cases/trials/archive_stores.py` (nuevo)
- `apps/backend/tests/integration/test_sprint7_sales_stock_exports.py` (fix de fecha hardcodeada)
- `apps/backend/tests/integration/test_billing.py` (nuevo, ver documento 02)
- `apps/backend/tests/integration/test_rate_limiting.py` (nuevo)
- `.github/workflows/ci-backend.yml` (verificar, no se confirmo en esta auditoria)

## Tests Requeridos

1. `test_rate_limit_blocks_after_threshold_on_login`
2. `test_rate_limit_returns_429_with_clear_message`
3. `test_suspended_store_cannot_login_regardless_of_is_active_flag`
4. `test_archive_stores_moves_long_suspended_stores_to_archived`
5. `test_archived_store_data_is_not_deleted`
6. `test_list_sales_defaults_to_calendar_today_uses_mocked_clock` (fix del test fragil existente)
7. Los 10 tests de billing/webhooks listados en el documento 02.

## Criterios de Aceptacion

- Ningun endpoint publico o de autenticacion esta sin limite de requests.
- Una tienda suspendida no puede operar sin importar el valor de `is_active`, verificado con test.
- Existe un proceso (aunque sea manual al inicio) para archivar tiendas suspendidas de larga data.
- La suite de tests pasa al 100% (0 failing) y cubre los escenarios criticos de billing.
- CI valida lint + tests + migraciones contra Postgres en cada cambio.

## Riesgos y Decisiones

- **Definir N dias para suspendido→archivado** es una decision de negocio (politica de retencion de datos), no tecnica. Sugerido: 90 dias suspendido sin pago → archivado; 365 dias archivado → candidato a purga manual revisada por un humano.
- **El check combinado de `is_active`/`access_status`** puede tener efectos secundarios en flujos existentes que hoy dependen solo de `is_active` (ej. si hay algun otro lugar del codigo que desactiva una tienda por una razon distinta a facturacion) — antes de aplicar el fix, buscar todos los usos de `is_active` sobre `stores` en el codebase para no romper un caso no contemplado en este analisis.
- Este documento asume que los documentos 02, 03 y 04 ya estan implementados o en curso, porque varios de sus tests (webhooks, invitaciones, sync) dependen de que esas features existan primero. Si se ejecuta este plan de forma aislada, priorizar solo las secciones 1, 2 y 4.1 (fix del test fragil), que no dependen de nada mas.
