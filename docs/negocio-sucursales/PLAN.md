# Negocios, sucursales y personas en varios negocios — plan

> Estado: **propuesta para revisar**. No hay código todavía. Mockups en
> [`mockups/`](mockups/) (se abren en el navegador). Fecha: 2026-11-13.

## 1. Objetivo

Que la app tenga una jerarquía clara y escalable sin cambiar la experiencia de hoy:

```
Persona (una cuenta, un correo)
  └─ Membresía (rol)  ──>  Negocio  (plan, catálogo, precios, personas, cobro)
                              └─ Sucursal (stock, caja, ventas, lugares, pedidos para recoger)
```

- **Todo negocio nace con 1 sucursal** ("Principal"). Con una sola sucursal la app se ve
  y funciona **igual que hoy**: no aparece la palabra "sucursal" en ninguna pantalla.
- **Más de una sucursal** es una función del **plan Multi-sucursal** (de pago): al
  activarla aparecen las pantallas nuevas (sucursales, transferencias, reportes por
  sucursal, encargados).
- **Una persona puede estar en varios negocios** (dueña de dos tiendas, o cajera en dos
  tiendas distintas que usan la app) con **una sola cuenta**. Esto no depende del plan.

## 2. Cómo está hoy (revisado en el código)

| Hoy | Problema para lo que viene |
|---|---|
| `stores` tiene todo: datos, plan, catálogo, políticas. 24 tablas cuelgan de `store_id`. | Bien como "negocio"; falta un nivel debajo (sucursal). |
| `products.stock` es un número por producto. Lotes, lugares, movimientos y caja son por tienda. | El stock, los lotes, la caja y las ventas tienen que ser **por sucursal**. |
| `users.store_id` y `users.role`: una persona pertenece a **una** tienda. `users.email` es único en toda la app. | Invitar a alguien que ya usa la app en otra tienda falla ("Este email ya pertenece a un usuario existente"). |
| La tienda activa sale de `user_metadata.store_id` de Auth y se confirma con la base. | Con varios negocios, la fuente tiene que ser la base (membresías), nunca el token. |
| Datos sin conexión: una sola base local `tiendastock-offline` por equipo, sin tienda ni sucursal. | Si alguien cambia de negocio/sucursal en el mismo celular se mezclan el catálogo y **las ventas pendientes**. Lo más delicado. |
| La suscripción vive en `stores` (trial, estado, próxima factura). Ya existe `storefront_tier`. | Sirve de base para el plan Multi-sucursal. |

## 3. Decisiones de diseño (y por qué)

1. **`stores` sigue siendo el negocio.** En la interfaz se llama "Negocio" solo cuando
   hace falta (selector de negocios, plan). No se renombra la tabla: las 24 tablas, la
   API y el catálogo público siguen igual. Menos riesgo, misma claridad.
2. **Tabla nueva `branches` (sucursales)** debajo de `stores`. Lo que pasa físicamente en
   un local lleva `branch_id`; lo que es del negocio sigue con `store_id`:

   | Es del **negocio** (`store_id`) | Es de la **sucursal** (`branch_id`, además de `store_id`) |
   |---|---|
   | Productos (nombre, SKU, código, precio, costo, foto, categoría, descuentos) | **Stock** (`product_stock`: cantidad y stock mínimo por sucursal) |
   | Categorías | Lotes y vencimientos (`product_batches`, `batch_consumptions`) |
   | Personas y membresías, invitaciones | Lugares en la tienda (`store_locations`, `product_locations`) |
   | Plan, cobro, auditoría de cobro | Caja y jornada (`store_business_days`, eventos, `cash_movements`) |
   | Política de descuentos | Ventas y anulaciones (`sales`) |
   | Catálogo público (uno por negocio) | Movimientos de stock (`stock_movements`) |
   | Importar CSV (elige a qué sucursal va el stock) | Pedidos del catálogo: sucursal donde se recoge (`storefront_requests`) |
   | | Cambios sincronizados (`sync_changes`) y transferencias |

   El **precio es del negocio** (igual en todas las sucursales). Un precio distinto por
   sucursal queda como mejora futura (columna opcional en `product_stock`), no en esta versión.
3. **Membresías.** `memberships(user_id, store_id, role, is_active, last_used_at)` y
   `membership_branches(membership_id, branch_id)`. Una persona = una cuenta (el correo
   sigue único); puede tener varias membresías. Reemplazan a `users.store_id` y `users.role`.
4. **Contexto activo = negocio + sucursal**, guardado en la sesión (cookie httpOnly) y
   validado en **cada** petición contra las membresías en un único lugar del backend
   (`CurrentContext`). El navegador solo *propone* la sucursal; la API decide.
5. **El plan da "permisos de producto" (entitlements)**, no `if` sueltos:
   `max_branches`, `transfers`, `branch_manager_role`, `consolidated_reports`. Se
   calculan desde el plan del negocio y un ajuste manual por negocio que solo el
   administrador de la plataforma puede cambiar (para pruebas o clientes especiales).
   La web y la API leen lo mismo: `GET /entitlements`.
6. **Transferencias como documento** (enviar → en tránsito → recibir), no como dos ajustes
   de stock sueltos. Es la práctica normal entre sucursales: deja rastro, maneja
   diferencias y nunca "crea" stock.
7. **Migraciones en dos tiempos (expandir y después contraer):** primero se agregan las
   tablas y columnas nuevas y se copian los datos (la app vieja sigue funcionando); en un
   despliegue posterior, cuando ya nada usa lo viejo, se borran `products.stock`,
   `users.store_id` y `users.role`. Cada paso se ensaya antes con el backup real.

## 4. Roles y permisos

| Puede… | Dueño (negocio) | Encargado de sucursal *(solo Multi-sucursal)* | Cajero |
|---|---|---|---|
| Vender, cobrar, ver productos | Todas las sucursales | Sus sucursales | Sus sucursales |
| Abrir y cerrar caja, movimientos de caja | ✓ | Sus sucursales | — (como hoy) |
| Anular ventas | ✓ | Sus sucursales | — |
| Crear y editar productos, precios, categorías | ✓ | — | — |
| Ajustar stock, lotes, lugares | ✓ | Sus sucursales | — |
| Transferencias: crear y enviar | ✓ | Desde sus sucursales | — |
| Transferencias: recibir | ✓ | En sus sucursales | ✓ (si se le permite) |
| Reportes | Todas + consolidado | Sus sucursales | — (como hoy) |
| Personas e invitaciones | ✓ | — | — |
| Sucursales, plan, catálogo público, políticas | ✓ | — | — |

- Con **1 sucursal** solo existen Dueño y Cajero, exactamente como hoy.
- El Dueño ve siempre todas las sucursales. Encargados y cajeros tienen asignadas una o
  varias (`membership_branches`). Siempre queda al menos un dueño activo (regla actual).

## 5. Flujos

### 5.1 Entrar (persona en uno o varios negocios) — mockup M1

- **1 negocio y 1 sucursal permitida:** entra directo, como hoy.
- **Varios negocios:** "¿A qué tienda entras?" con nombre, logo, rol y sucursal. Recuerda
  la última; la próxima vez entra directo y se cambia desde el menú.
- **1 negocio con varias sucursales permitidas** (cajero en 2 locales): elige sucursal
  al entrar; la caja y las ventas van a esa sucursal.

### 5.2 Saber dónde estoy y cambiar — mockup M2

- **Solo si hay más de una opción** (varios negocios o varias sucursales permitidas):
  - Celular: una franja fina bajo el título: "Tienda Local · Centro ▾".
  - Escritorio: el bloque de la tienda arriba de la barra lateral muestra la sucursal y
    abre el selector.
- Con 1 negocio y 1 sucursal: nada nuevo (como hoy).
- Cambiar no cierra sesión. Si hay ventas sin enviar de la sucursal anterior, se siguen
  enviando a **su** sucursal (cada venta pendiente guarda negocio y sucursal).

### 5.3 Invitar a alguien que ya usa la app — mockup M4

- Si el correo ya tiene cuenta, la invitación **agrega una membresía**: llega el mismo
  correo de invitación y la persona acepta **entrando con su contraseña** (o Google), sin
  crear otra cuenta. Si no tiene cuenta, el flujo de hoy (crea contraseña).
- Con Multi-sucursal, al invitar se elige rol y sucursales.

### 5.4 Sucursales (con el plan) — mockup M3

- Configuración → **Sucursales**: lista con estado de caja de hoy, ventas del día y
  personas; crear, editar (nombre, dirección, teléfono, horario) y desactivar.
- Desactivar exige stock en 0 o transferirlo antes, y caja cerrada. Nunca se borra (las
  ventas viejas la siguen nombrando).
- Sin el plan: la tarjeta muestra la sucursal única y "Abre otra sucursal con el plan
  Multi-sucursal".

### 5.5 Stock por sucursal — mockup M5

- En Productos y en Vender se ve **el stock de la sucursal activa**.
- El detalle del producto (dueño/encargado) suma una tarjeta "Stock por sucursal" con la
  cantidad de cada una y un botón **Transferir**.
- Productos nuevos: el stock inicial va a la sucursal activa; las demás empiezan en 0.

### 5.6 Transferencias entre sucursales — mockup M6

Estados: **Borrador → Enviada (en tránsito) → Recibida** (o **Cancelada** antes de recibir).

1. **Crear** (origen, destino, productos y cantidades). Avisa si una cantidad supera el
   stock del origen.
2. **Enviar**: el stock **sale del origen** (movimiento `transfer_out`). Los lotes salen
   por FEFO (primero los que vencen antes) y viajan con su fecha de vencimiento.
3. **En tránsito**: ninguna de las dos sucursales lo puede vender. Aparece en Inicio de
   la sucursal destino: "1 transferencia por recibir".
4. **Recibir**: se confirma cada producto; si llegó menos, se anota la diferencia con
   motivo (faltante, dañado). Entra lo recibido (`transfer_in`) y la diferencia queda
   como `transfer_loss`, visible en Reportes → Movimientos de stock.
5. **Cancelar** (solo enviada y no recibida): el stock vuelve al origen.

Reglas: número correlativo por negocio (T-0001), nunca se edita una transferencia
enviada, todo queda con quién y cuándo. **En esta versión las transferencias necesitan
conexión** (son entre dos lugares; evita conflictos de stock sin conexión).

### 5.7 Caja y ventas por sucursal

- Cada sucursal abre y cierra su propia caja. La jornada (`store_business_days`) lleva
  `branch_id`; Vender usa la sucursal activa.
- Ventas, anulaciones y recibos llevan la sucursal (el recibo muestra su dirección).

### 5.8 Reportes — mockup M7

- Selector arriba: **Todas las sucursales** (consolidado, solo dueño) o una sucursal.
- Ventas: total y comparación por sucursal; Cierres de caja: por sucursal;
  Movimientos de stock: incluye transferencias; Descargas: con columna sucursal.

### 5.9 Catálogo público y pedidos

- Un catálogo por negocio (como hoy). Con varias sucursales, el cliente elige **dónde
  recoge** (o envío); el stock mostrado es el de esa sucursal.
- Pedidos: filtro por sucursal; cada sucursal ve los suyos.

### 5.10 Plan y cobro — mockup M8

- Planes: **Estándar** (1 sucursal) y **Multi-sucursal** (precio base + un monto por
  cada sucursal extra; el número exacto es una decisión pendiente, D-B1).
- Plan y pagos muestra el plan, cuántas sucursales usa y el pago por WhatsApp (como hoy).
- Si baja de plan con 2+ sucursales activas: no se borra nada; las sucursales extra
  quedan "solo lectura" hasta volver al plan o desactivarlas.

## 6. Datos sin conexión (lo más delicado)

- Una base local **por negocio y sucursal**: `tiendastock-<negocio>-<sucursal>`.
- Cada venta pendiente guarda `store_id` y `branch_id`; la API rechaza una venta de una
  sucursal donde la persona ya no tiene permiso (queda "por revisar", nunca se pierde).
- **Migración en el equipo** (una sola vez, al abrir la versión nueva): si existe la base
  vieja `tiendastock-offline`, sus ventas pendientes se mueven a la base de la sucursal
  activa y el catálogo se vuelve a bajar. Hecho **ahora**, con 1 tienda, no hay nada que mover.
- `device_id` sigue siendo del equipo; la sincronización filtra por sucursal.

## 7. Cambios de base de datos (resumen)

Tablas nuevas: `branches`, `product_stock`, `memberships`, `membership_branches`,
`stock_transfers`, `stock_transfer_items`, `store_entitlement_overrides`.

Columnas nuevas `branch_id` (NOT NULL después de copiar): `product_batches`,
`batch_consumptions`, `store_locations`, `product_locations`, `store_business_days`,
`store_business_day_events`, `cash_movements`, `sales`, `stock_movements`,
`storefront_requests`, `sync_changes`. `stores.plan` (`standard` | `multi_branch`).

Copia de datos (migración, una vez por negocio):

1. Crear la sucursal **Principal** con el nombre, dirección y teléfono del negocio.
2. `branch_id` = Principal en todas las filas existentes (por lotes en tablas grandes).
3. `product_stock` desde `products.stock` y `min_stock`.
4. `memberships` desde `users.store_id` y `users.role`; el dueño queda con todas las
   sucursales y los cajeros con la Principal.

Índices: `(branch_id, …)` donde hoy hay `(store_id, …)` en ventas, jornadas y movimientos.

## 8. API (resumen)

- `CurrentContext` (backend): persona + negocio + sucursal + rol + entitlements, una sola
  dependencia. Todas las consultas de datos de sucursal filtran por `branch_id` desde ahí.
- `GET /me/memberships`, `POST /session/context` (cambiar negocio/sucursal).
- `GET /entitlements`. `CRUD /branches` (con el plan).
- `GET /products/{id}/stock` (por sucursal). `CRUD /stock-transfers`, `POST
  /stock-transfers/{id}/send`, `/receive`, `/cancel`.
- Reportes aceptan `branch_id` o `all` (solo dueño).
- **Compatibilidad**: mientras quede alguna app vieja (PWA guardada en un celular), si una
  petición no trae sucursal la API usa la Principal. Se retira cuando ya no lleguen.

## 9. Riesgos y cómo se resuelven

| Riesgo | Solución |
|---|---|
| Mezclar ventas sin conexión entre negocios o sucursales | Base local por negocio+sucursal y cada venta con su sucursal (punto 6), antes de todo lo demás |
| Invitar a alguien que ya usa la app falla | Invitación = membresía; acepta entrando con su cuenta |
| Confiar en el token para saber la tienda | `CurrentContext` desde la base; el token solo identifica a la persona |
| Una consulta olvida filtrar por sucursal y muestra datos de otra | Filtro en una sola dependencia + tests que crean 2 sucursales y verifican que nada se cruza |
| Stock negativo o "creado" en transferencias | Documento con estados, una sola transacción por paso, `SELECT … FOR UPDATE` sobre el stock |
| App vieja en un celular contra la API nueva | Compatibilidad: sin sucursal = Principal; migración local de la base sin conexión |
| Migrar con muchos datos | Expandir/contraer, copia por lotes, ensayo con el backup real restaurado, backup antes |
| Una persona invitada no podía volver a entrar (id distinto en Auth) | Ya arreglado (PR #5): Auth se crea con el mismo id |
| Bajar de plan con 2+ sucursales | Nada se borra: las extra quedan solo lectura |

## 10. Fases

| Fase | Qué | Visible para el usuario | Estimado |
|---|---|---|---|
| **0. Preparación** | Base sin conexión por negocio/sucursal con migración local; mensaje claro al invitar; `CurrentContext`; script para ensayar migraciones con el backup real | Nada (solo el mensaje) | 2 días |
| **1. Jerarquía base** | `branches` + Principal, `branch_id`, `product_stock`, membresías, entitlements, compatibilidad | Nada: con 1 sucursal todo igual | 4–5 días |
| **2. Varios negocios por persona** | Selector al entrar, cambio de negocio, invitar a cuentas existentes, franja de contexto | Solo quien está en 2+ negocios | 3 días |
| **3. Multi-sucursal** | Sucursales, encargado, sucursal activa en Vender/Caja, stock por sucursal, reportes por sucursal y consolidado, pedidos con sucursal | Solo con el plan | 5–6 días |
| **4. Transferencias** | Documento, enviar/recibir/cancelar, diferencias, aviso en Inicio, movimientos | Solo con el plan | 4–5 días |
| **5. Plan y cobro** | Plan Multi-sucursal, Plan y pagos, ajuste manual del admin, bajar de plan | Dueños | 2 días |
| **6. Contraer** | Borrar `products.stock`, `users.store_id`, `users.role` y la compatibilidad | Nada | 1 día |

Total: unas 3–4 semanas. Cada fase se despliega sola, con tests, ensayo de migración con
el backup real y forma de volver atrás.

## 11. Cómo se prueba

- Backend: tests con **dos negocios y dos sucursales** en cada área (ventas, stock,
  caja, reportes, sincronización) que verifican que nada se cruza.
- Transferencias: enviar, recibir con diferencias, cancelar, concurrencia (dos envíos a
  la vez del mismo stock).
- Sin conexión: venta pendiente en sucursal A, cambiar a B, volver la conexión → la venta
  llega a A. Migración de la base vieja.
- E2E: los flujos de M1–M8 a 375, 768 y 1280 px; dueño, encargado y cajero.
- Migraciones: ensayo con el último backup de producción restaurado en el stack local.

## 12. Decisiones pendientes

| Id | Decisión | Recomendación |
|---|---|---|
| D-B1 | Precio del plan Multi-sucursal | Base + monto por sucursal extra |
| D-B2 | Precio distinto por sucursal | No en esta versión; columna opcional después |
| D-B3 | ¿El cajero puede recibir transferencias? | Sí, si el dueño lo permite (interruptor en Sucursales) |
| D-B4 | ¿Transferencias sin conexión? | No en esta versión |
| D-B5 | Catálogo público con varias sucursales | Un catálogo; el cliente elige dónde recoge |
| D-B6 | ¿Cobrar por negocio o por persona en varios negocios? | Por negocio (como hoy); la persona no paga |
