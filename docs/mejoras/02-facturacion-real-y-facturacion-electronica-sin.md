# Facturacion Real (Cobro de Suscripciones) y Facturacion Electronica SIN Bolivia

Fecha: 2026-08-25

## Importante: esto son dos cosas distintas

Este plan cubre dos problemas de facturacion que se confunden facilmente porque comparten la palabra "facturacion" pero son sistemas independientes:

1. **Cobro de nuestra propia suscripcion SaaS** — como nosotros le cobramos mensualmente al dueno de la tienda por usar el software. Hoy esto es 100% manual.
2. **Modulo de facturacion electronica SIN** — una feature nueva de producto para que las tiendas (nuestros clientes) puedan emitir facturas fiscales validas ante el Servicio de Impuestos Nacionales (SIN) de Bolivia cuando registran una venta en el POS. Esto no es para cobrarnos a nosotros, es un feature que vendemos dentro del producto.

Se planifican juntas porque la Parte 2 es una oportunidad comercial fuerte: en Bolivia, a partir de octubre 2026 se vuelve obligatorio para los contribuyentes alcanzados emitir documentos fiscales solo por modalidad electronica/computarizada/portal web. Si el producto ya tiene esto integrado, se convierte en una razon de peso para que una tienda pague la suscripcion (cumplimiento legal, no solo comodidad).

---

## Parte 1: Cobro de Suscripcion SaaS

### Estado Actual (verificado en codigo)

- Existe la maquina de estados completa a nivel de datos: `stores.access_status`, `stores.subscription_status`, `stores.trial_expires_at`, `stores.next_billing_date`, `stores.grace_period_started_at`, `stores.billing_email`, `stores.billing_nit`, `stores.billing_razon_social`.
- Existen las tablas `billing_audit_log` y `webhook_events` (migracion `020`) pero **ningun codigo de aplicacion las escribe o lee todavia**.
- Existe `ProcessGracePeriodUseCase` (`apps/backend/src/application/use_cases/trials/process_grace_period.py`) pero **no se invoca desde ningun lado** (ni cron, ni endpoint, ni startup).
- El endpoint que expira trials (`expire-trials`) y el endpoint admin de billing (`PATCH /admin/stores/{id}/billing`) estan **bloqueados detras de `settings.DEBUG`** — no funcionan en produccion.
- El endpoint admin de billing tiene un bug logico: en `apps/backend/src/presentation/api/v1/billing.py` bloquea actualizar cualquier tienda que no sea la propia del usuario que llama, lo cual contradice que sea un endpoint "admin actualiza cualquier tienda". Se corrige en este plan (ver seccion Correcciones).
- Ya existe un analisis tecnico detallado y bueno en `docs/clientes-suscriptores/implementacion-pendiente-y-pagos.md` con arquitectura de scheduler, flujo de cobro con Libelula, manejo de webhooks y dunning. **Este plan adopta ese diseno como base** y agrega las correcciones y el orden de ejecucion.
- No existe ninguna integracion real de pasarela de pago (Libelula u otra). `LIBELULA_API_KEY`, `LIBELULA_WEBHOOK_SECRET`, etc. no existen en `settings.py`.

### Alcance Incluido

1. **Scheduler (APScheduler)**: job diario que corre `ExpireTrialsUseCase` y `ProcessGracePeriodUseCase` sin depender de `DEBUG`. Seguir el diseno ya documentado en `docs/clientes-suscriptores/implementacion-pendiente-y-pagos.md` seccion 1.
2. **Corregir el endpoint admin de billing**: reemplazar el chequeo `store_id != user.store_id` por un rol de administrador real (nuevo campo o rol `platform_admin`, separado de `owner`/`cashier` que son roles dentro de una tienda). Sin esto, nadie puede operar manualmente el billing de un cliente en produccion.
3. **Auditoria real**: cada cambio de `access_status`/`subscription_status` (manual o por webhook) escribe una fila en `billing_audit_log` con quien hizo el cambio, valores antes/despues y motivo.
4. **Eleccion y evaluacion de pasarela de pago.** Libelula es la opcion propuesta en los docs existentes porque es un proveedor boliviano de cobros/facturacion. Antes de integrar, validar con el proveedor: métodos de pago que soporta (QR simple, tarjeta, transferencia), si tiene soporte para cobro recurrente automatico o si cada cobro requiere generar un link/QR nuevo, y el costo por transaccion. Si el cobro recurrente automatico no esta disponible o es limitado, el flujo minimo viable es: generar un cobro mensual (QR/link de pago) y notificar al cliente por WhatsApp/email, no necesariamente débito automatico desde el dia uno.
5. **Webhook receptor** (`POST /api/v1/webhooks/libelula` o el proveedor que se elija): validacion de firma HMAC, idempotencia via `webhook_events.event_id`, actualizacion de estado de suscripcion.
6. **Dunning basico**: al menos el email/WhatsApp de "pago fallido, tienes N dias de gracia" y "acceso suspendido". No hace falta la secuencia completa de 6 recordatorios documentada en el plan original desde el dia 1 — empezar con 2 mensajes (pago fallido, suspension) y agregar recordatorios intermedios despues.
7. **UI de billing real** en el frontend: hoy `BillingSettings.tsx` es solo lectura. Agregar boton "Pagar ahora" que dispare la generacion del cobro (QR/link) y lo muestre, y una vista de historial de pagos (leyendo `billing_audit_log`/pagos confirmados).
8. **Corregir bug conocido**: `store_repository.py` filtra por `is_active` en vez de `access_status` en `get_by_id` — una tienda suspendida podria seguir pasando checks. Este fix es de bajo riesgo y esta explicitamente documentado en `docs/clientes-suscriptores/implementacion-pendiente-y-pagos.md` seccion 5.

### Fuera de Alcance (por ahora)

- Multiples planes/tiers de precio (empezar con un plan unico).
- Facturacion por numero de usuarios/asientos.
- Sistema de colas con triggers de base de datos (Opcion A/B del doc original) — usar APScheduler simple primero; migrar a colas solo si el volumen de tiendas lo justifica.
- Recuperacion de pagos con reintentos automaticos sofisticados (mas alla del flujo de gracia ya definido).

### Modelo de Datos

Sin cambios de esquema nuevos — las tablas ya existen (`stores`, `billing_audit_log`, `webhook_events`). Agregar:

- Indice compuesto `(subscription_status, trial_expires_at)` en `stores`.
- Indice compuesto `(subscription_status, grace_period_started_at)` en `stores`.
- Columna o tabla nueva para distinguir `platform_admin` de `owner`/`cashier` (para el fix del endpoint admin). Opcion simple: columna `users.is_platform_admin boolean default false`, gestionada solo por consola/migración manual (no expuesta en la API de invitaciones).

### API Propuesta (resumen, ver detalle completo en `docs/clientes-suscriptores/implementacion-pendiente-y-pagos.md`)

```http
POST /api/v1/webhooks/libelula          # receptor de webhooks, sin auth de sesion, con HMAC
POST /api/v1/billing/checkout           # nuevo: genera cobro/QR para la tienda actual (owner-only)
GET  /api/v1/billing/history            # nuevo: historial de pagos/cambios de la tienda actual
PATCH /api/v1/admin/stores/{id}/billing # corregido: requiere platform_admin, no DEBUG
```

### Archivos a Tocar

- `apps/backend/pyproject.toml` (agregar `apscheduler`, cliente HTTP del proveedor de pago elegido)
- `apps/backend/src/infrastructure/scheduler.py` (nuevo)
- `apps/backend/src/main.py` (inicializar scheduler en `lifespan`)
- `apps/backend/src/presentation/api/v1/billing.py` (corregir admin check, agregar checkout/history)
- `apps/backend/src/presentation/api/v1/webhooks.py` (nuevo)
- `apps/backend/src/infrastructure/services/payments/` (nuevo, cliente del proveedor)
- `apps/backend/src/infrastructure/database/repositories/billing_audit_log_repository.py` (nuevo)
- `apps/backend/src/infrastructure/database/repositories/webhook_event_repository.py` (nuevo)
- `apps/backend/src/infrastructure/database/store_repository.py` (fix `is_active` → `access_status`)
- `apps/backend/src/config/settings.py` (variables del proveedor de pago)
- `apps/web/src/features/settings/components/BillingSettings.tsx` (boton pagar + historial)
- `apps/backend/src/infrastructure/database/alembic/versions/xxx_add_platform_admin.py` (nuevo)

### Tests Requeridos

1. `test_scheduler_expires_trials_past_due_date`
2. `test_scheduler_suspends_stores_after_grace_period`
3. `test_webhook_rejects_invalid_signature`
4. `test_webhook_is_idempotent_on_duplicate_event_id`
5. `test_webhook_charge_succeeded_reactivates_store`
6. `test_webhook_charge_failed_starts_grace_period`
7. `test_admin_billing_requires_platform_admin_role`
8. `test_admin_billing_can_update_any_store`
9. `test_billing_change_writes_audit_log`
10. `test_suspended_store_cannot_login_regardless_of_is_active_flag` (cubre el fix del bug conocido)

### Criterios de Aceptacion

- Un trial vencido se suspende automaticamente sin intervencion manual, en produccion (`DEBUG=false`).
- Existe al menos un metodo de pago real conectado y probado end-to-end (aunque sea manual/QR, no debito automatico).
- Todo cambio de estado de facturacion queda en `billing_audit_log` con autor y motivo.
- El endpoint admin de billing funciona en produccion y esta protegido por un rol distinto al de `owner` de tienda.
- El dueno de una tienda puede ver su historial de pagos y generar un cobro nuevo desde la web.

### Riesgos y Decisiones

- **Proveedor de pago sin confirmar.** Libelula es la hipotesis de los docs existentes, pero no esta validado tecnicamente (no hay acceso a su documentacion de API en este analisis). Antes de programar, alguien debe contactar a Libelula (u otra pasarela boliviana: hay varias que ademas ya estan homologadas para facturacion electronica, ver Parte 2 — podria convenir usar el mismo proveedor para cobro y para facturacion fiscal si ofrece ambos).
- **Costo por transaccion** debe conocerse antes de fijar el precio del plan (impacta margen).
- **Platform admin**: decidir si el rol de super-administrador se gestiona por migracion manual (mas simple, mas seguro para v1) o por una pantalla de administracion interna (mas trabajo, no urgente con pocas tiendas).

---

## Parte 2: Modulo de Facturacion Electronica SIN Bolivia (feature de producto)

### Por que importa ahora

Investigacion realizada (fuentes al final): el Servicio de Impuestos Nacionales (SIN) de Bolivia opera el Sistema de Facturacion Virtual (SFV) con varias modalidades: Manual, Prevalorada, Electronica en Linea, Computarizada en Linea, Portal Web, Maquina Registradora, Electronica por Ciclos. Segun la normativa vigente, **a partir del 1 de octubre de 2026** los contribuyentes alcanzados por las resoluciones del SIN deben emitir sus documentos fiscales exclusivamente por modalidad electronica/computarizada/portal web — ya no manual. Esto significa que un numero creciente de tiendas (nuestro mercado objetivo) va a necesitar emitir facturas electronicas si o si, y hoy el producto no lo ofrece.

Si el POS de esta app pudiera emitir la factura fiscal directamente al cerrar una venta, eso deja de ser un "nice to have" y se convierte en una razon de cumplimiento legal para pagar la suscripcion — mucho mas fuerte que "control de stock".

### Como funciona el sistema del SIN (resumen tecnico)

- **CUIS (Codigo Unico de Inicio de Sistemas)**: se solicita una vez por sistema de facturacion autorizado, valido por 365 dias, renovable desde 5 dias antes de vencer.
- **CUFD (Codigo Unico de Facturacion Diaria)**: el sistema de facturacion (ya con CUIS vigente) debe pedirlo todos los dias al SIN; habilita la emision de facturas por 24 horas.
- **Modalidad Computarizada en Linea**: el sistema propio (o de un tercero autorizado) emite la factura con un codigo de control/hash (no firma digital), la envia, registra y valida en los servidores del SIN. Permite envio individual, agrupado o por paquetes masivos (coordinando con el SIN).
- **Modalidad Electronica en Linea**: similar pero con mas requisitos de validacion en tiempo real.
- Formato de intercambio: XML validado contra XSD, para evitar errores antes de enviar al SIN.

### Dos caminos posibles de implementacion

| Camino | Descripcion | Pros | Contras |
|---|---|---|---|
| **A. Integracion directa con el SIN** | El propio backend se homologa como "Sistema de Facturacion" ante el SIN, implementa CUIS/CUFD y los web services de la modalidad Computarizada en Linea. | Sin costo de intermediario por factura a largo plazo; control total. | Proceso de homologacion largo, requiere cumplir requisitos tecnicos y legales especificos del SIN, mantenimiento cuando cambie la normativa, alto riesgo si el deadline de octubre 2026 esta cerca. |
| **B. Integracion via facilitador tecnologico homologado** | Usar un proveedor ya homologado ante el SIAT que expone una API REST (ej. Facturacion Facil, Gosocket, Xmart Cloud — proveedores identificados en la investigacion, homologados ante SIAT) y nuestro backend le manda los datos de la venta para que emita la factura fiscal. | Se puede lanzar en semanas, no meses. El proveedor absorbe el riesgo de homologacion y mantenimiento ante cambios de normativa. | Costo por factura o mensualidad al proveedor (se traslada al precio del plan o se cobra aparte). Dependencia de un tercero. |

**Recomendacion: empezar con el Camino B.** Dado el plazo (octubre 2026) y que este no es el negocio principal (nuestro negocio es el inventario/POS, no ser un facilitador fiscal), integrar contra un proveedor homologado via API REST es mucho mas rapido y de menor riesgo legal. Se puede reevaluar el Camino A mas adelante si el volumen de facturas justifica internalizarlo.

### Alcance Incluido (Fase de investigacion + MVP)

1. **Investigacion formal (no tecnica, comercial/legal) — primer paso obligatorio:**
   - Contactar a 2-3 facilitadores homologados (los identificados: Facturacion Facil, Gosocket, Xmart Cloud) y pedir: documentacion de API, precio por factura/mensualidad, tiempo de onboarding, si soportan multi-cliente (nosotros como intermediario para muchas tiendas, cada una con su propio NIT) o si cada tienda debe contratar directo.
   - Confirmar el requisito legal exacto: que tipo de contribuyente esta "alcanzado" por la obligatoriedad de octubre 2026 (depende de categoria/facturacion anual de cada tienda cliente) — esto determina si es urgente para todas las tiendas o solo para las mas grandes.
   - Definir el modelo de negocio de este modulo: ¿se cobra aparte como add-on, o esta incluido en el plan superior?
2. **Diseño de arquitectura de integracion** (una vez elegido proveedor): un puerto/adapter en el backend (`IFiscalInvoiceProvider`) para no acoplar el dominio a un proveedor especifico — si se cambia de facilitador despues, no debe tocar el resto del sistema.
3. **Flujo en el POS**: al cerrar una venta, opcion de "Emitir factura fiscal" que capture los datos fiscales del cliente final (NIT/CI, razon social o "sin nombre"/consumidor final) y llame al proveedor.
4. **Almacenar** el numero de factura, CUF (Codigo Unico de Facturacion) o equivalente, y el XML/PDF generado, asociado a la venta (`sales`/`sale_items`).
5. **Configuracion por tienda**: cada tienda cliente necesita su propio NIT y credenciales/token del facilitador (no es un dato compartido) — agregar campos a `stores` o tabla nueva `store_fiscal_config`.
6. **Manejo de contingencia**: que pasa si el SIN o el proveedor esta caido al momento de la venta (la normativa boliviana contempla modo contingencia con emision offline y envio posterior) — el POS no debe bloquear la venta por esto, debe permitir completar la venta y marcar la factura como "pendiente de emision".

### Fuera de Alcance (por ahora)

- Integracion directa con el SIN (Camino A) — reevaluar mas adelante.
- Modalidad Electronica en Linea (mas compleja) — empezar con Computarizada en Linea si el facilitador lo permite, que es mas simple de integrar.
- Notas de credito/debito electronicas — MVP solo cubre factura de venta.
- Reportes fiscales agregados para el contribuyente (libro de ventas IVA, etc.) — evaluar como Fase 2 de este mismo modulo una vez que la emision basica funcione, dado que ya hay un modulo de reportes en el producto y esta info se puede derivar de ahi.

### Modelo de Datos (propuesto, sujeto al proveedor elegido)

Nueva tabla `store_fiscal_config`:

```text
id uuid primary key
store_id uuid not null references stores(id)
nit varchar(20) not null
razon_social varchar(255) not null
provider varchar(50) not null          -- 'facturacion_facil' | 'gosocket' | 'xmart' | etc.
provider_credentials jsonb not null    -- cifrado a nivel de aplicacion, nunca en texto plano
is_active boolean not null default false
created_at timestamptz not null
updated_at timestamptz not null
```

Nuevos campos en `sales` (o tabla `sale_fiscal_documents` separada, preferido para no ensuciar `sales`):

```text
sale_fiscal_documents:
  id uuid primary key
  sale_id uuid not null references sales(id)
  cuf varchar(100) null                -- codigo unico de facturacion, cuando se emite
  status varchar(20) not null          -- pending | issued | failed | contingency
  provider_response jsonb null
  pdf_url text null
  xml_url text null
  issued_at timestamptz null
  created_at timestamptz not null
```

### Archivos a Tocar (cuando se pase a implementacion, no en la fase de investigacion)

- `apps/backend/src/application/ports/fiscal_invoice_provider.py` (nuevo, interfaz)
- `apps/backend/src/infrastructure/services/fiscal/` (nuevo, adapter del proveedor elegido)
- `apps/backend/src/domain/entities/sale_fiscal_document.py` (nuevo)
- `apps/backend/src/infrastructure/database/alembic/versions/xxx_create_fiscal_tables.py` (nuevo)
- `apps/backend/src/presentation/api/v1/fiscal.py` (nuevo, endpoints de configuracion y emision)
- `apps/web/src/features/pos/components/` (agregar accion "Emitir factura fiscal" al cerrar venta)
- `apps/web/src/features/settings/components/FiscalSettings.tsx` (nuevo, configuracion de NIT/proveedor por tienda)

### Tests Requeridos

1. `test_sale_can_be_completed_without_fiscal_invoice` (la venta nunca debe bloquearse por esto)
2. `test_fiscal_invoice_issued_successfully_stores_cuf`
3. `test_fiscal_invoice_provider_failure_marks_pending_contingency`
4. `test_fiscal_config_credentials_are_encrypted_at_rest`
5. `test_fiscal_config_is_store_scoped` (tenant isolation)

### Criterios de Aceptacion (MVP de este modulo)

- Existe una decision documentada de que proveedor facilitador se va a usar, con costo confirmado.
- Una tienda puede configurar su NIT/razon social y activar facturacion fiscal desde Settings.
- Al cerrar una venta, el cajero puede emitir una factura fiscal valida (o marcarla como consumidor final segun corresponda) sin que esto bloquee el flujo de venta si el proveedor falla.
- El documento fiscal (CUF, PDF) queda asociado a la venta y es consultable despues.

### Riesgos y Decisiones

- **Plazo regulatorio (octubre 2026) es corto.** Si se confirma que las tiendas objetivo estan alcanzadas por la obligatoriedad, este modulo deberia acelerarse y podria incluso competir en prioridad con la Parte 1 de este mismo documento — revisar con negocio en cuanto se tenga respuesta de los facilitadores contactados.
- **Costo por factura** puede no ser trivial a escala (cientos de tiendas emitiendo facturas a diario) — hay que modelar el costo antes de decidir si se absorbe o se traslada al cliente.
- **No confundir con Parte 1**: el cobro de nuestra propia suscripcion (Parte 1) puede o no usar el mismo proveedor que la facturacion fiscal de las tiendas (Parte 2) — son decisiones independientes, aunque vale la pena preguntarle a Libelula si ofrece ambos servicios para simplificar.
- **Este documento es un punto de partida, no una spec final**: los detalles tecnicos exactos de la API del facilitador elegido (autenticacion, formato exacto del payload) solo se conocen tras el contacto comercial/tecnico directo con el proveedor — no estan publicados abiertamente.

### Fuentes consultadas

- [Facturacion Electronica - SIAT Impuestos Nacionales](https://siatinfo.impuestos.gob.bo/index.php/informacion/modalidades-facturacion/facturacion-electronica)
- [Facturacion Computarizada en Linea - SIAT](https://siatinfo.impuestos.gob.bo/index.php/informacion/modalidades-facturacion/facturacion-computarizada)
- [Solicitud CUFD - SIAT](https://siatinfo.impuestos.gob.bo/index.php/facturacion-en-linea/implementacion-servicios-facturacion/codigos/solicitud-cufd)
- [Solicitud CUIS - SIAT](https://siatinfo.impuestos.gob.bo/index.php/facturacion-en-linea/implementacion-servicios-facturacion/codigos/solicitud-cuis)
- [Facturacion electronica en Bolivia: guia completa 2026 - YoFacturo](https://yo-facturo.com/blog/facturacion-electronica-bolivia-guia/)
- [Facturacion electronica en Bolivia: lo que tu negocio necesita saber - Bemorex](https://bemorex.com/blog/facturacion-electronica-bolivia-que-necesitas-saber/)
- [Nuevas obligaciones en el sistema de factura electronica en Bolivia - GroupSeres](https://blog.groupseres.com/la-factura-electr%C3%B3nica-en-bolivia-el-sistema-de-facturaci%C3%B3n-virtual)
- [Facturacion Facil - Facturacion Electronica Bolivia](https://facturacion-facil.com.bo/)
- [Todo sobre la Factura Electronica Bolivia - Gosocket](https://gosocket.net/todo-sobre-la-factura-electronica-bolivia/)
- [API de facturacion electronica en Bolivia - Xmart Cloud](https://xmart.cloud/pricing/invoice)

Nota: esta investigacion se hizo por busqueda web, no reemplaza confirmar directamente con el SIN/SIAT o con los proveedores antes de comprometerse a una implementacion.
