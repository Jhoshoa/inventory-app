# Clientes Suscriptores — Análisis e Implementación

## Contexto Actual

El sistema maneja un **free trial** de 30 días por tienda mediante una sola columna:

- `stores.trial_expires_at` — fecha UTC en que expira el trial.
- `NULL` en tiendas legacy o cuando un admin extiende manualmente la fecha.

No hay forma de diferenciar entre:
- Un usuario en **prueba gratuita** (debe ver banners de trial, se bloquea al expirar)
- Un usuario **suscriptor que paga** (no debe ver banners de trial, tiene fechas de facturación)

Esto provoca bugs: si un admin extiende `trial_expires_at` para un cliente que pagó, el sistema le muestra "Tu período de prueba termina en N días" y peor aún, **lo bloquea al pasar la fecha** aunque esté al día con sus pagos.

---

## Modelo de Datos Propuesto

### Tienda (`stores`)

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `access_status` | `VARCHAR(20)` | `'active'` | Estado técnico: `active`, `suspended`, `archived`, `purged` |
| `subscription_status` | `VARCHAR(20)` | `'trial'` | Estado comercial: `trial`, `active`, `past_due`, `canceled`, `expired` |
| `trial_expires_at` | `TIMESTAMPTZ` | `NULL` | Solo aplica cuando `subscription_status = 'trial'` |
| `next_billing_date` | `TIMESTAMPTZ` | `NULL` | Próximo pago (activo) o fin de servicio (cancelado) |
| `grace_period_started_at` | `TIMESTAMPTZ` | `NULL` | Se setea al entrar en `past_due`. Permite calcular días de gracia restantes |
| `subscription_started_at` | `TIMESTAMPTZ` | `NULL` | Cuándo empezó a pagar (primera conversión trial → activo) |
| `billing_email` | `VARCHAR(255)` | `NULL` | Email de facturación (puede diferir del email del owner) |
| `billing_nit` | `VARCHAR(50)` | `NULL` | NIT para facturación (clientes Bolivia) |
| `billing_razon_social` | `VARCHAR(255)` | `NULL` | Razón social para facturación |

### Valores de `access_status`

| Valor | Significado |
|---|---|
| `active` | Tienda funcionando normalmente, usuarios pueden operar |
| `suspended` | Bloqueada automáticamente por falta de pago. Usuarios no pueden loguear |
| `archived` | Datos retenidos por política, tienda no accesible. Solo admin puede ver |
| `purged` | Datos eliminados definitivamente |

### Valores de `subscription_status`

| Valor | Significado |
|---|---|
| `trial` | En período de prueba gratuito. Se bloquea al vencer `trial_expires_at` |
| `active` | Suscripción activa, pagos al día |
| `past_due` | Pago fallido, dentro del período de gracia |
| `canceled` | Suscripción cancelada, servicio activo hasta `next_billing_date` |
| `expired` | Suscripción terminada (sin gracia, sin cancelación activa). Bloqueado |

### Lógica de las fechas

Cada columna de fecha es relevante **solo** en ciertos `subscription_status`:

| `subscription_status` | Fecha que gobierna | Propósito |
|---|---|---|
| `trial` | `trial_expires_at` | Saber cuándo se bloquea el acceso |
| `active` | `next_billing_date` | Mostrar "próximo pago: DD/MM" |
| `past_due` | `grace_period_started_at` | Calcular días de gracia restantes (`grace_period_started_at + GRACE_PERIOD_DAYS - now`) |
| `canceled` | `next_billing_date` | Mostrar "servicio activo hasta DD/MM" |
| `expired` | *(ninguna)* | Bloqueado, no importa ninguna fecha |

**No se mezclan.** Una tienda `active` con `trial_expires_at` en el pasado **nunca** se bloquea por trial.

---

## Flujo de Estados

```
                     [registro]
                        |
                   subscription_status = 'trial'
                   trial_expires_at = now + 30 días
                        |
              ┌─────────┴──────────┐
              │                    │
       trial expira         paga/convierte
              │                    │
              ▼                    ▼
    subscription_status     subscription_status
    = 'expired'             = 'active'
    access_status           next_billing_date
    = 'suspended'           = now + 30 días
              │                    │
              │              ┌─────┴──────┐
              │              │            │
              │         pago falla   pago ok
              │              │            │
              │              ▼            │
              │     subscription_status   │
              │     = 'past_due'          │
              │     grace_started_at=now  │
              │              │            │
              │        ┌─────┴─────┐      │
              │        │           │      │
              │   paga antes   supera     │
              │   de gracia   gracia      │
              │        │           │      │
              │        ▼           ▼      │
              │   status='active'  status │
              │   next_billing=    ='expired'
              │   now + 30        access  │
              │                   ='suspended'
              │                          │
              │                    [vuelve a pagar]
              │                          │
              │                    status='active'
              │                    access='active'
              │                    next_billing=now+30
              │
              │   cancelación voluntaria
              │          │
              │          ▼
              │   subscription_status
              │   = 'canceled'
              │   servicio activo
              │   hasta next_billing_date
              │          │
              │    [llega next_billing_date]
              │          │
              │          ▼
              │   subscription_status
              │   = 'expired'
              │   access_status
              │   = 'suspended'
              ▼
```

---

## Reglas de Acceso (Backend)

### En login (`auth.py`) y en cada request (`GetCurrentUserContextUseCase`)

Se bloquea el acceso si **cualquiera** de estas condiciones se cumple:

```
access_status != 'active'
    → "Tu cuenta ha sido suspendida. Contacta a soporte."

O

subscription_status == 'expired'
    → "Tu suscripción ha expirado. Contacta a soporte para reactivar."

O

subscription_status == 'trial'
    AND trial_expires_at IS NOT NULL
    AND now >= trial_expires_at
    → "Tu periodo de prueba ha expirado. Adquiere un plan para continuar."

O

subscription_status == 'past_due'
    AND grace_period_started_at IS NOT NULL
    AND now >= grace_period_started_at + GRACE_PERIOD_DAYS
    → "Tu suscripción ha sido suspendida por falta de pago."
```

**Qué NO bloquea:**
- `subscription_status = 'active'` con `trial_expires_at` en pasado → **no bloquea**
- `subscription_status = 'past_due'` dentro del grace period → **no bloquea** (solo muestra warning)
- `subscription_status = 'canceled'` antes de `next_billing_date` → **no bloquea**
- `subscription_status = 'trial'` con `trial_expires_at IS NULL` (legacy) → **no bloquea**

### Prioridad de mensajes

El orden de los `if` importa. Los mensajes deben mostrarse en este orden:

1. `access_status != 'active'` → "Cuenta suspendida"
2. `subscription_status = 'trial' AND expirado` → "Prueba expirada"
3. `subscription_status = 'past_due' AND sin gracia` → "Suspendido por falta de pago"
4. `subscription_status = 'expired'` → "Suscripción expirada"
5. `user.is_active = False` → "Usuario inactivo"

---

## Grace Period (Período de Gracia)

### Configuración

```python
# settings.py
GRACE_PERIOD_DAYS: int = 15
DUNNING_EMAIL_DAYS: list[int] = [1, 4, 8, 14]
DATA_RETENTION_DAYS: int = 365
```

### Timeline

| Día desde fallo | `subscription_status` | App | Notificación |
|---|---|---|---|
| 0 (falla el pago) | `past_due` | Funcional 100% | Banner amarillo leve + email "No pudimos procesar tu pago" |
| 1-3 | `past_due` | Funcional 100% | Banner amarillo + email diario |
| 4-7 | `past_due` | Funcional 100% | Banner naranja + email diario |
| 8-14 | `past_due` | Funcional 100% | Banner rojo "Tu cuenta será suspendida en N días" + email urgente |
| 15 | `expired` + `access_status='suspended'` | Bloqueado | Email final + banner en login |

### Cálculo de días de gracia restantes

```python
# En Store entity
@property
def grace_days_remaining(self) -> int | None:
    if self.subscription_status != 'past_due' or self.grace_period_started_at is None:
        return None
    elapsed = (datetime.now(timezone.utc) - self.grace_period_started_at).days
    return max(settings.GRACE_PERIOD_DAYS - elapsed, 0)
```

---

## Política de Retención de Datos

| Período | Estado | Accesible para el cliente | Accesible para admin |
|---|---|---|---|
| Día 0-90 desde `expired` | `access_status = 'suspended'` | No | Sí (restauración posible) |
| Día 91-365 | `access_status = 'archived'` | No | Sí (solo lectura) |
| Día 366+ | `access_status = 'purged'` | No | No (datos eliminados) |

### Reactivación

- **Durante grace period** (día 0-14): pago exitoso → `subscription_status = 'active'`, `next_billing_date = now + 30`, `grace_period_started_at = NULL`. El banner de advertencia desaparece automáticamente.
- **Día 15-90 (suspended)**: pago exitoso → `subscription_status = 'active'`, `access_status = 'active'`, `next_billing_date = now + 30`. Requiere comunicación con pasarela de pago o acción manual del admin.
- **Día 91+ (archived)**: solo el admin puede restaurar. Proceso manual con exportación previa de datos si es necesario.

---

## Estrategia de Notificaciones

> **MVP**: solo banners in-app. Las notificaciones por email se implementarán en una fase posterior cuando se integre una pasarela de pago.

### A. Usuarios en Trial (`subscription_status = 'trial'`)

| Condición | Banner en app | ¿Bloquea login? |
|---|---|---|
| `days_until_trial_ends > 7` | Ninguno | No |
| `1 <= days_until_trial_ends <= 7` | Amarillo: "Tu periodo de prueba termina en N días. Adquiere un plan para no perder acceso." | No |
| `days_until_trial_ends <= 0` | Rojo: "Tu periodo de prueba ha expirado. Adquiere un plan para continuar usando la aplicación." | Sí |

### B. Usuarios Suscriptores (`subscription_status = 'active'`)

| Condición | Banner en app | ¿Bloquea login? |
|---|---|---|
| Normal | Ninguno en app general. En Settings → Billing se muestra "Plan: Mensual. Próximo pago: DD/MM" | No |
| `days_until_next_billing <= 7` | Alerta suave **solo en Settings → Billing**: "⚠ Próximo pago en N días" | No |

**Nunca** se muestra el banner de trial a un suscriptor.

### C. Usuarios en Mora (`subscription_status = 'past_due'`)

| Días en mora | Banner en app | ¿Bloquea login? |
|---|---|---|
| 1-7 | Amarillo: "No pudimos procesar tu pago. Verifica tu método de pago." | No |
| 8-14 | Rojo: "Tu cuenta será suspendida en N días si no regularizas tu pago." | No |
| 15+ (superó gracia) | Ya no aplica, pasó a `expired` | Sí |

### D. Usuarios Cancelados (`subscription_status = 'canceled'`)

| Período | Banner | ¿Bloquea login? |
|---|---|---|
| Antes de `next_billing_date` | Informativo en Settings → Billing: "Tu suscripción fue cancelada. El servicio estará activo hasta el DD/MM." | No |
| Después de `next_billing_date` | Pasó a `expired`, ya no aplica | Sí |

### E. Usuarios Expirados (`subscription_status = 'expired'`)

| Banner en login | ¿Bloquea login? |
|---|---|
| "Tu suscripción ha expirado. Contacta a soporte para reactivar." | Sí |

### F. Tienda Suspendida (`access_status = 'suspended'`)

| Banner en login | ¿Bloquea login? |
|---|---|
| "Tu cuenta ha sido suspendida. Contacta a soporte." | Sí |

---

## Backend: Endpoints

### `GET /api/v1/billing/status`

Devuelve el estado completo de facturación de la tienda del usuario autenticado. Solo `owner`.

```json
{
  "subscription_status": "active",
  "access_status": "active",
  "trial_expires_at": null,
  "next_billing_date": "2026-08-01T00:00:00Z",
  "grace_period_started_at": null,
  "grace_days_remaining": null,
  "subscription_started_at": "2026-07-01T00:00:00Z",
  "billing_email": "cliente@example.com",
  "billing_nit": "1234567890",
  "billing_razon_social": "Mi Tienda SRL",
  "days_until_next_billing": 23
}
```

### `PATCH /api/v1/admin/stores/{store_id}/billing`

Actualización manual del estado de facturación (para pagos por transferencia, ajustes manuales, etc.).

**Request:**
```json
{
  "subscription_status": "active",
  "next_billing_date": "2026-09-01T00:00:00Z",
  "billing_email": "cliente@example.com",
  "reason": "Pago por transferencia recibido"
}
```

**Seguridad:**
- Solo accesible con API key de admin + rate limit (5 req/min)
- Cada cambio se registra en `billing_audit_log`

### `POST /api/v1/billing/webhook` (futuro)

Integración con pasarela de pago. Endpoint público con validación de firma HMAC + tabla `webhook_events` para idempotencia.

---

## Tablas Auxiliares

### `billing_audit_log`

Registra toda modificación manual al estado de facturación de un store.

```sql
CREATE TABLE billing_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    changed_by      UUID NOT NULL REFERENCES users(id),
    changed_by_email VARCHAR(255) NOT NULL,
    old_values      JSONB,            -- snapshot del estado anterior
    new_values      JSONB,            -- snapshot del nuevo estado
    reason          TEXT NOT NULL,     -- obligatorio: "Pago por transferencia", "Ajuste admin", etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_billing_audit_store ON billing_audit_log(store_id);
CREATE INDEX ix_billing_audit_created ON billing_audit_log(created_at);
```

### `webhook_events`

Previene procesamiento duplicado de eventos de la pasarela de pago (idempotencia).

```sql
CREATE TABLE webhook_events (
    event_id        VARCHAR(255) PRIMARY KEY,  -- ID único del evento (ej. "evt_123abc" de Stripe)
    event_type      VARCHAR(100) NOT NULL,      -- "invoice.paid", "invoice.payment_failed", etc.
    store_id        UUID REFERENCES stores(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'processed',  -- processed, failed
    payload         JSONB NOT NULL,             -- body completo del evento (para debugging)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_webhook_events_type ON webhook_events(event_type);
CREATE INDEX ix_webhook_events_created ON webhook_events(created_at);
```

### `GET /api/v1/admin/stores/expiring-soon`

Lista stores con `next_billing_date` próximo a vencer (próximos 7 días) o `trial_expires_at` próximo a vencer. Para que el admin haga follow-up.

---

## Backend: Scheduled Tasks (Crons)

| Tarea | Frecuencia | Acción |
|---|---|---|
| `ExpireTrialsUseCase` | Diaria | Stores con `subscription_status = 'trial'` y `trial_expires_at < now` → `subscription_status = 'expired'`, `access_status = 'suspended'`. **No toca `user.is_active`** — el bloqueo se hace a nivel store |
| `ProcessGracePeriodUseCase` | Diaria | Stores con `subscription_status = 'past_due'` y `grace_period_started_at + GRACE_PERIOD_DAYS < now` → `subscription_status = 'expired'`, `access_status = 'suspended'`. **No toca `user.is_active`** |
| `ArchiveStoresUseCase` | Mensual | Stores con `access_status = 'suspended'` y `updated_at + DATA_RETENTION_DAYS < now` → `access_status = 'archived'` |

---

## Migración de Datos

### Migration `019_add_subscription_columns_to_stores.py`

```python
# Schema changes (idempotent)
- ADD COLUMN access_status VARCHAR(20) NOT NULL DEFAULT 'active'
- ADD COLUMN subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial'
- ADD COLUMN next_billing_date TIMESTAMPTZ
- ADD COLUMN grace_period_started_at TIMESTAMPTZ
- ADD COLUMN subscription_started_at TIMESTAMPTZ
- ADD COLUMN billing_email VARCHAR(255)
- ADD COLUMN billing_nit VARCHAR(50)
- ADD COLUMN billing_razon_social VARCHAR(255)

# Data migration (one-time, dentro del upgrade)
UPDATE stores SET
    access_status = 'active',
    subscription_status = 'active'
WHERE trial_expires_at IS NULL;

UPDATE stores SET
    access_status = 'active',
    subscription_status = 'trial'
WHERE trial_expires_at IS NOT NULL;
```

### Consideraciones

- Las tiendas legacy (`trial_expires_at IS NULL`) se migran a `active` + `access_status = 'active'`. Son clientes que existen antes del sistema de trial, se consideran suscriptores permanentes.
- Las tiendas con trial activo (`trial_expires_at IS NOT NULL`) se migran a `trial`. Su comportamiento no cambia.
- Las tiendas con `is_active = False` actualmente se migran con `access_status = 'suspended'`. El admin decide si reactivar o archivar.

---

## Frontend: Cambios Necesarios

### Tipos

```typescript
// types.ts
export interface AuthUser {
  id: string;
  email: string;
  store_id?: string;
  store_name?: string | null;
  full_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
  trial_expires_at?: string | null;
  days_until_trial_ends?: number | null;
  subscription_status?: string | null;  // NUEVO
}
```

```typescript
// session.ts
export interface Session {
  userId: string;
  email: string;
  storeId: string | null;
  storeName: string;
  fullName: string | null;
  role: UserRole;
  trialExpiresAt: string | null;
  daysUntilTrialEnds: number | null;
  subscriptionStatus: string | null;  // NUEVO
}
```

### TrialBanner (refactorizado)

```tsx
function TrialBanner({ session }: { session: Session }) {
  const status = session.subscriptionStatus;

  if (status === 'active' || status === null) return null;
  if (status === 'canceled') return <Banner variant="info">Tu suscripción fue cancelada. El servicio estará activo hasta...</Banner>;
  if (status === 'past_due') return <Banner variant="warning">No pudimos procesar tu pago. Verifica tu método de pago.</Banner>;
  if (status === 'expired') return <Banner variant="error">Tu suscripción ha expirado. Contacta a soporte.</Banner>;

  // status === 'trial'
  if (session.daysUntilTrialEnds === null) return null;
  if (session.daysUntilTrialEnds <= 0) return <Banner variant="error">Tu periodo de prueba ha expirado...</Banner>;
  if (session.daysUntilTrialEnds <= 7) return <Banner variant="warning">Tu periodo de prueba termina en {session.daysUntilTrialEnds} días...</Banner>;

  return null;
}
```

### Settings → Billing (ruta nueva)

- Ruta: `/dashboard/settings/billing`
- Solo accesible para rol `owner`
- Componentes:
  - `BillingOverview` — resumen del plan, fechas, estado
  - `BillingInfoForm` — email de facturación, NIT, razón social
  - `BillingHistoryTable` — historial de pagos (cuando haya pasarela)

---

## Seguridad y Precauciones

1. **Solo `owner`** puede ver/editar billing. Los `cashier` no tienen acceso a la ruta ni a los endpoints.
2. **Auditoría**: toda modificación manual se registra en `billing_audit_log` con `changed_by`, `old_values`, `new_values`, `reason`. El `reason` es obligatorio.
3. **No eliminar `user.is_active`**: los crons de trial/grace solo cambian `store.access_status`. El `user.is_active` sigue siendo responsabilidad del admin (desactivar un cashier que renunció, etc.).
4. **Rate limiting**: 100 req/min en `/billing/status`, 5 req/min en `/admin/billing`.
5. **Webhooks** (futuro): validar firma HMAC, usar `webhook_events(event_id)` para idempotencia.
6. **No exponer datos sensibles**: nunca incluir tokens de pago, API keys, o datos internos en errores.
7. **GDPR / derecho al olvido**: endpoint para anonimizar datos personales bajo petición.
8. **Store sin owner**: si se elimina el último owner, asignar tienda a un admin de soporte automáticamente.

---

## Testing

| Tipo | Qué probar | Prioridad |
|---|---|---|
| Unitario | Propiedades de `Store`: `grace_days_remaining`, `is_trial_active` con `subscription_status` | Alta |
| Integración | Login con `subscription_status = 'expired'` → rechazar | Alta |
| Integración | Login con `subscription_status = 'active'` + `trial_expires_at` pasado → permitir | Alta |
| Integración | Login con `subscription_status = 'past_due'` dentro de gracia → permitir | Alta |
| Integración | Login con `subscription_status = 'past_due'` fuera de gracia → rechazar | Alta |
| Integración | `ExpireTrialsUseCase` ignora stores `active` | Alta |
| Integración | `ProcessGracePeriodUseCase` solo afecta `past_due` con gracia excedida | Alta |
| Integración | Migración de datos: legacy → `active`, trial → `trial` | Media |
| Frontend | `TrialBanner` con cada `subscription_status` | Media |
| Frontend | Ruta `/settings/billing` protegida por rol | Media |

---

## Orden de Implementación

### Fase 1 — Backend base

1. Migration `019`: schema + data migration
2. Actualizar `Store` entity: nuevos campos + propiedades
3. Actualizar `StoreModel` + `StoreRepository`
4. Corregir `get_current_user_context.py` y `auth.py` con la nueva lógica de bloqueo
5. Reescribir `ExpireTrialsUseCase`: solo cambiar `store.access_status = 'suspended'`, no tocar `user.is_active`
6. Agregar `ProcessGracePeriodUseCase` (nuevo cron)
7. Actualizar `TrialStatusUseCase` → `BillingStatusUseCase`

### Fase 2 — Endpoints

1. `GET /api/v1/billing/status`
2. `PATCH /api/v1/admin/stores/{store_id}/billing` + auditoría
3. `GET /api/v1/admin/stores/expiring-soon`

### Fase 3 — Frontend

1. Actualizar tipos (`AuthUser`, `Session`)
2. Refactorizar `TrialBanner`
3. Crear ruta `/dashboard/settings/billing` + componentes
4. Badge de alerta en sidebar para `past_due`

### Fase 4 — Pasarela de pago (futuro)

1. Integración Stripe / Mercado Pago
2. Webhook con idempotencia
3. Manejo completo del ciclo de vida

---

## Preguntas Pendientes

1. ¿Se usará pasarela de pago (Stripe/Mercado Pago) o los pagos serán manuales?
2. ¿Habrá planes múltiples (mensual, semestral, anual) o solo uno?
3. ¿El precio varía por cantidad de usuarios/cashiers?
4. ¿Se necesita exportación de datos antes de archivar una tienda?
5. ¿Se permite al usuario cancelar desde la app o solo por contacto con soporte?
