# Implementacion Pendiente: Automatizacion, Pagos y Colas

## 1. Cron Job: Desactivacion Diaria (8:00 AM)

### Estado: PENDIENTE

Actualmente la logica de trial vencido y periodo de gracia se evalua **en cada request** via `GetCurrentUserContextUseCase`, pero esto se movio a `access_status` solamente. La desactivacion real (cambiar `access_status` a `suspended`) debe hacerla un cron job diario.

### Propuesta de implementacion

```
┌─────────────────────────────────────────────────────┐
│  Cron Job (8:00 AM todos los dias)                  │
│                                                     │
│  1. ExpireTrialsUseCase                             │
│     → Busca stores con:                             │
│       subscription_status = 'trial'                 │
│       trial_expires_at < now                        │
│       access_status = 'active'                      │
│     → Actualiza:                                    │
│       access_status = 'suspended'                   │
│       subscription_status = 'expired'               │
│                                                     │
│  2. ProcessGracePeriodUseCase                       │
│     → Busca stores con:                             │
│       subscription_status = 'past_due'              │
│       grace_period_started_at + GRACE_PERIOD_DAYS   │
│         < now                                       │
│       access_status = 'active'                      │
│     → Actualiza:                                    │
│       access_status = 'suspended'                   │
│       subscription_status = 'expired'               │
└─────────────────────────────────────────────────────┘
```

### Opciones de implementacion

| Opcion | Pro | Contra |
|---|---|---|
| **APScheduler** (libreria Python) | Simple, no requiere infraestructura externa | No persiste ejecuciones, no hay retry si falla |
| **Cron del sistema operativo** | Confiable, nativo | Hay que configurarlo en cada deploy, no escala en contenedores |
| **GitHub Actions / Cron interna** | Si ya hay infraestructura de CI/CD | No es el proposito de CI |
| **Tarea programada en la misma app** (middleware on_startup) | Facil de implementar | Se ejecuta solo si hay trafico, no es confiable |

**Recomendacion:** Usar **APScheduler** con almacenamiento en SQLite/PostgreSQL para persistencia y recuperacion ante fallos.

```python
# apps/backend/src/infrastructure/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from src.application.use_cases.trials.expire_trials import ExpireTrialsUseCase
from src.application.use_cases.trials.process_grace_period import ProcessGracePeriodUseCase

scheduler = AsyncIOScheduler(
    jobstores={"default": SQLAlchemyJobStore(url=settings.DATABASE_URL)}
)

@scheduler.scheduled_job("cron", hour=8, minute=0, id="expire_trials")
async def expire_trials_job():
    uc = ExpireTrialsUseCase(store_repo)
    count = await uc.execute()
    logger.info("Expired %s trials", count)

@scheduler.scheduled_job("cron", hour=8, minute=5, id="process_grace_period")
async def process_grace_period_job():
    uc = ProcessGracePeriodUseCase(store_repo)
    count = await uc.execute()
    logger.info("Processed %s grace periods", count)
```

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `pyproject.toml` | Agregar `apscheduler` a dependencias |
| `src/infrastructure/scheduler.py` | **Nuevo** — configuracion de APScheduler |
| `src/main.py` | Inicializar scheduler en `lifespan` |
| `src/config/settings.py` | Agregar `DATABASE_URL` si no existe |

---

## 2. Integracion con Sistema de Pagos (Libelula)

### Estado: PENDIENTE — Requiere analisis de la API de Libelula

Libelula es un sistema de facturacion y cobros boliviano. La integracion debe permitir:

1. **Cobro recurrente mensual** a los suscriptores
2. **Registro de facturas** con NIT y razon social
3. **Webhooks** para recibir notificaciones de pago exitoso/fallido
4. **Actualizacion automatica** del estado de suscripcion en nuestra app

### Arquitectura propuesta

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐
│              │  Cobro   │                  │ Webhook │                  │
│  Inventory   │─────────▶│    Libelula      │◀────────│  Inventory App   │
│  App (cron)  │          │  (API Pagos)     │─────────│  (Webhook Rx)    │
│              │          │                  │ Notif.  │                  │
└──────────────┘          └──────────────────┘         └──────────────────┘
       │                                                      │
       │                                                      │
       ▼                                                      ▼
┌──────────────────┐                                ┌──────────────────┐
│  billing_audit_   │                                │  Update          │
│  log              │                                │  subscription    │
└──────────────────┘                                │  status +        │
                                                    │  next_billing    │
                                                    └──────────────────┘
```

### Flujo de Cobro

```
1. Cron mensual (1ro de cada mes a las 6:00 AM):
   ┌─────────────────────────────────────────────────────┐
   │  list_by_subscription_status('active')               │
   │  foreach store:                                      │
   │     payload = {                                      │
   │       "client": store.billing_email,                 │
   │       "nit": store.billing_nit,                      │
   │       "razon_social": store.billing_razon_social,    │
   │       "amount": PLAN_PRICE,                          │
   │       "description": "Suscripcion mensual",          │
   │       "external_id": str(store.id),                  │
   │     }                                                │
   │     response = libelula.create_charge(payload)       │
   │     billing_audit_log.insert(store_id, payload)      │
   └─────────────────────────────────────────────────────┘

2. Webhook de Libelula (respuesta asincrona):
   POST /api/v1/webhooks/libelula
   {
     "event": "charge.succeeded",  // o "charge.failed"
     "external_id": "store-uuid",
     "libelula_charge_id": "ch_123",
     "amount": 99.00,
     "paid_at": "2026-08-01T06:05:00Z"
   }

3. Procesamiento del webhook:
   ┌─────────────────────────────────────────────────────┐
   │  if event == "charge.succeeded":                     │
   │     store.subscription_status = 'active'            │
   │     store.access_status = 'active'                  │
   │     store.next_billing_date = now + 1 month         │
   │     store.grace_period_started_at = NULL             │
   │                                                      │
   │  if event == "charge.failed":                        │
   │     store.subscription_status = 'past_due'           │
   │     store.grace_period_started_at = now              │
   │                                                      │
   │  billing_audit_log.insert(...)                       │
   └─────────────────────────────────────────────────────┘
```

### Consideraciones de seguridad para webhooks

- Validar firma HMAC-SHA256 en cada request entrante
- Usar un `WEBHOOK_SECRET` configurado en Libelula y en settings
- Idempotencia: usar `event_id` unico para evitar procesar duplicados
- Timeout de respuesta: < 5 segundos (devolver 200 rapido, procesar en background)

```python
# apps/backend/src/presentation/api/v1/webhooks.py
@router.post("/webhooks/libelula")
async def libelula_webhook(request: Request):
    payload = await request.json()
    signature = request.headers.get("X-Libelula-Signature")

    if not verify_hmac(payload, signature, settings.LIBELULA_WEBHOOK_SECRET):
        raise HTTPException(401, "Firma invalida")

    event_id = payload["event_id"]
    if await webhook_repo.exists(event_id):
        return {"ok": True}  # Idempotente

    await webhook_repo.insert(WebhookEvent(event_id=event_id, ...))

    if payload["event"] == "charge.succeeded":
        await process_successful_charge(payload)
    elif payload["event"] == "charge.failed":
        await process_failed_charge(payload)

    return {"ok": True}
```

---

## 3. Sistema de Colas con Trigger

### Estado: PENDIENTE — Alternativa a cron jobs sincronos

Para evitar depender exclusivamente de cron jobs (que pueden fallar si el servidor esta caido a las 8:00 AM), se puede implementar un sistema de colas con triggers:

### Opcion A: Base de datos como cola (recomendada para MVP)

```
┌──────────┐    INSERT    ┌──────────────────┐    ┌──────────────┐
│ Trigger  │─────────────▶│  pending_tasks    │◀───│  Worker      │
│ (DB)     │              │  table            │────│  (polling)   │
└──────────┘              └──────────────────┘    └──────────────┘
```

- Una tabla `pending_tasks` con columnas: `id`, `task_type`, `payload`, `status`, `scheduled_at`, `created_at`
- Triggers en la BD que insertan tareas automaticamente:
  - `AFTER UPDATE ON stores` → si `subscription_status` cambia a `'past_due'`, insertar tarea `send_grace_period_warning`
  - `AFTER UPDATE ON stores` → si `subscription_status` cambia a `'expired'`, insertar tarea `notify_suspension`
- Un worker (Python asyncio) que polling cada 30 segundos y ejecuta tareas pendientes

### Opcion B: Redis + Bull/Celery (escalable)

```
┌──────────┐    PUBLISH    ┌──────────┐    ┌──────────────┐
│  API     │─────────────▶│  Redis   │───▶│  Worker Pool  │
│  Server  │   (pub/sub)  │  Queue   │    │  (N procesos) │
└──────────┘              └──────────┘    └──────────────┘
```

- Redis como backend de cola (ARES/Redis Stack)
- Libreria: `rq` (simple) o `celery` (completo, con beat para cron)
- Workers separados del servidor web
- Escalamiento horizontal: agregar mas workers segun demanda

### Casos de uso para colas

| Evento | Tarea | Prioridad |
|---|---|---|
| Trial expira en 7 dias | Enviar email recordatorio | Baja |
| Trial expira en 1 dia | Enviar email recordatorio + notificacion in-app | Media |
| Trial expirado (cron 8 AM) | Bloquear acceso + enviar email | Alta |
| Pago falla | Enviar email "pago fallido" + activar grace period | Alta |
| Grace period termina en 3 dias | Enviar email recordatorio | Media |
| Grace period termina (cron 8 AM) | Bloquear acceso + enviar email | Alta |
| Pago exitoso | Enviar recibo + actualizar next_billing_date | Alta |
| Nuevo registro | Enviar email bienvenida + instrucciones trial | Baja |

---

## 4. Dunning (Recordatorios de Pago)

### Estado: PENDIENTE — Post-MVP

El dunning es el proceso de enviar recordatorios automaticos escalonados cuando un pago falla:

```
Dia 0  ───  Pago falla
               → Email: "Tu pago ha fallado. Tu servicio continua por 15 dias."
               → Notificacion in-app: Badge amarillo "Vencido"

Dia 3  ───  Email: "Recordatorio: regulariza tu pago. Quedan 12 dias de gracia."

Dia 7  ───  Email: "Quedan 8 dias de gracia. Actualiza tu metodo de pago."

Dia 12 ───  Email: "Ultimos 3 dias de gracia. Tu acceso se suspendera pronto."

Dia 14 ───  Email: "Ultimo dia de gracia. Actua hoy para mantener tu acceso."

Dia 15 ───  Acceso suspendido.
               → Email: "Tu acceso ha sido suspendido. Contacta a soporte."
```

### Tabla de templates de email

| Template | Disparador | Contenido |
|---|---|---|
| `trial_7d` | Cron diario | "Quedan 7 dias de prueba..." |
| `trial_1d` | Cron diario | "Ultimo dia de prueba..." |
| `trial_expired` | ExpireTrialsUseCase | "Prueba finalizada, adquiere un plan" |
| `payment_failed` | Webhook charge.failed | "Pago fallido, tienes 15 dias de gracia" |
| `grace_remaining` | Cron diario | "Quedan N dias de gracia" |
| `grace_last_day` | Cron diario | "Ultimo dia de gracia" |
| `suspended` | ProcessGracePeriodUseCase | "Acceso suspendido por falta de pago" |
| `payment_received` | Webhook charge.succeeded | "Pago recibido, gracias" |
| `subscription_reactivated` | Admin action | "Bienvenido de vuelta, tu acceso esta restaurado" |

---

## 5. Pendientes Tecnicos Inmediatos

### Backend

| Item | Archivo | Descripcion |
|---|---|---|
| `get_by_id` usa `is_active` | `store_repository.py:51` | Linea 55: `filter_by(is_active=True)`. Las stores suspendidas tienen `access_status='suspended'` pero `is_active=True`. Cambiar a `access_status='active'` O mantener ambos. **Requiere decision.** |
| `list_by_expired_trial` | `store_repository.py:65` | Ya filtra por `subscription_status='trial'`. Correcto. |
| Scheduler con APScheduler | `src/infrastructure/scheduler.py` | **No creado.** Pendiente de implementar. |
| Endpoint `PATCH /admin/stores/{id}/billing` | `billing.py` | Solo disponible en DEBUG. En produccion debe ir detras de autenticacion real de admin. |
| `update_subscription` settea `grace_period_started_at` | `store_repository.py:102` | Cuando cambia a `past_due`, deberia settear `grace_period_started_at = now`. Actualmente no lo hace. |

### Base de Datos

| Item | Descripcion |
|---|---|
| Migracion 021 | Corrige stores con trial vencido que migraron como `subscription_status='trial'`. **Ejecutar antes de implementar cron jobs.** |
| Indice compuesto | `(subscription_status, trial_expires_at)` para acelerar `ExpireTrialsUseCase`. Opcional pero recomendado. |
| Indice compuesto | `(subscription_status, grace_period_started_at)` para acelerar `ProcessGracePeriodUseCase`. Opcional pero recomendado. |

### Frontend

| Item | Archivo | Descripcion |
|---|---|---|
| Pagina de billing | `app/(app)/dashboard/settings/billing/page.tsx` | Creada. Muestra estado actual. Sin formulario de pago real aun. |
| Badge en header | `AppHeader.tsx` | Implementado con variantes de color segun estado. |
| TrialBanner | `TrialBanner.tsx` | Refactorizado para manejar todos los estados. |

---

## 6. Arquitectura Final Recomendada

```
                         ┌──────────────────────────────────┐
                         │          Internet                │
                         └──────┬────────────────┬──────────┘
                                │                │
                    ┌───────────┘                └───────────┐
                    ▼                                        ▼
          ┌─────────────────────┐              ┌──────────────────────┐
          │   Inventory App      │              │   Libelula API       │
          │   (FastAPI+Next.js)   │◀────────────│   (Pagos/Facturas)   │
          └────────┬────────────┘   Webhooks   └──────────────────────┘
                   │
     ┌─────────────┼──────────────┐
     │             │              │
     ▼             ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│ PostgreSQL│ │ Redis    │ │ APScheduler  │
│ (Datos)   │ │ (Colas)  │ │ (Cron jobs)  │
└──────────┘ └──────────┘ └──────────────┘
     │
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│  Tablas de billing                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ stores (access_status, subscription_status,          │  │
│  │        trial_expires_at, next_billing_date,          │  │
│  │        grace_period_started_at, billing_*)            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ billing_audit_log (store_id, changed_by, old_values, │  │
│  │                  new_values, reason, created_at)      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ webhook_events (event_id, event_type, store_id,      │  │
│  │                status, payload, created_at,           │  │
│  │                processed_at)                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ pending_tasks (task_type, payload, status,            │  │
│  │              scheduled_at) [OPCIONAL]                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Secuencia completa: Ciclo de vida de un suscriptor

```
1. Registro → store.create() → trial_expires_at = now + 30d
                                    subscription_status = 'trial'
                                    access_status = 'active'

2. Cron diario (8 AM) → ExpireTrialsUseCase
   - No afecta trials activos
   - Cuando trial_expira → subscription_status = 'expired'
                           access_status = 'suspended'

3. Usuario compra plan → POST /api/v1/webhooks/libelula (charge.succeeded)
   → subscription_status = 'active'
   → access_status = 'active'
   → next_billing_date = now + 30d

4. Cron mensual (1ro del mes) → Libelula.create_charge()
   → Por cada store con subscription_status = 'active'

5. Pago falla → POST /api/v1/webhooks/libelula (charge.failed)
   → subscription_status = 'past_due'
   → grace_period_started_at = now
   → Se envia email "Pago fallido"

6. Cron diario (8 AM) → ProcessGracePeriodUseCase
   → Si grace_period_started_at + 15d < now:
        subscription_status = 'expired'
        access_status = 'suspended'

7. Usuario regulariza → POST /api/v1/webhooks/libelula (charge.succeeded)
   → subscription_status = 'active'
   → access_status = 'active'
   → grace_period_started_at = NULL
   → next_billing_date = now + 30d
```

### Dependencia externas necesarias (cuando se integre Libelula)

| Variable | Descripcion |
|---|---|
| `LIBELULA_API_KEY` | API key para autenticacion |
| `LIBELULA_WEBHOOK_SECRET` | Secreto HMAC para validar webhooks |
| `LIBELULA_BASE_URL` | Endpoint base de la API |
| `SUBSCRIPTION_PLAN_PRICE` | Precio del plan mensual en BOB |
| `SUBSCRIPTION_PLAN_CURRENCY` | Moneda (BOB) |
