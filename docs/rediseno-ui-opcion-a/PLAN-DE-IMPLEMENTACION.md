# Plan de implementación: rediseño opción A "Mostrador"

Este documento dice **en qué orden** construir el rediseño sin romper nada. Incluye el trabajo del backend, los errores encontrados en la web actual, las mejoras, y **las reglas para decidir lo que los mockups no dicen**.

Documentos relacionados:

- [README.md](README.md): qué tiene cada pantalla, de dónde sale cada dato, validaciones y cambios de backend B1–B7.
- [mockups/](mockups/): copia de los tableros del lienzo. Cada tablero tiene una columna de **notas** con caminos, validaciones, permisos, API y estados.
- Lienzo en línea: "Tu Tiendamiga · Propuestas de UI admin y cajero" (link en el README).

Este documento es una lista viva. Cuando se decide algo, se encuentra un error o una fase termina, se actualiza aquí y en el README.

---

## 1. Cómo trabajar cada fase

Antes de empezar una fase:

1. Leer en el README la sección de esas páginas.
2. Abrir los tableros de la fase (la columna "Tableros" de cada fase) y leer **todas** sus notas: caminos, validaciones, permisos, API y estados.
3. Abrir la pantalla actual en la web (dueño y cajero) y anotar todo lo que hace hoy. Nada de lo que existe se pierde: la [lista de paridad](#7-lista-de-paridad-lo-que-hoy-funciona-y-no-se-puede-perder) es obligatoria.
4. Si algo no está en el mockup ni en las notas, decidirlo con las [reglas de la sección 3](#3-reglas-para-todas-las-pantallas). Cuando la regla no alcanza, anotarlo en [Decisiones pendientes](#5-decisiones-pendientes) y preguntar antes de inventar.

Una fase está **terminada** cuando:

- Cumple el mockup en 375, 768 y 1280 px.
- Funciona con dueño y con cajero, y el cajero no ve ni puede usar lo que no le corresponde (en la pantalla y entrando por la URL).
- Tiene sus estados: cargando, vacío, error, sin conexión y sin permiso.
- Cada validación del README está en la web y el error de la API (400, 409, 422) se muestra en su campo.
- Pasan `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` y `pnpm test:e2e` (web), y `pytest`, `ruff` y `alembic upgrade head` si se tocó el backend.
- La lista de paridad de esa área está revisada.
- El README y este documento están al día.

Cada fase va en su propia rama y PR, con capturas de celular y escritorio, y se puede publicar sola.

---

## 2. Reglas para no tener problemas

- **Las rutas no cambian.** Solo cambian los textos y el orden del menú. Rutas nuevas: `/dashboard/caja`, `/dashboard/products/categorias` y `/dashboard/products/lugares`. Los links guardados, la PWA instalada (`start_url: /dashboard`) y los tests de rutas siguen sirviendo.
- **Primero el backend, después la web que lo usa.** Los cambios B1–B7 solo agregan campos o parámetros opcionales: no rompen la web actual ni la app móvil. Se publican antes de la fase que los necesita.
- **Después de cada cambio de API**, exportar el OpenAPI (`python -m scripts.export_openapi`) y commitear `apps/backend/openapi.json`. La web hoy define sus tipos a mano en `features/*/types.ts` (no hay tipos generados en el repo): al usar un campo nuevo, agregarlo ahí con el mismo nombre y tipo que en el OpenAPI.
- **La web funciona sin los cambios opcionales.** Si B4, B5 o B6 no se hacen, la pantalla se muestra sin ese dato. Nada se rompe.
- **Un componente para cada cosa** y reusar los que ya existen (`components/ui`: Dialog, ConfirmDialog, EmptyState, ErrorState, ForbiddenState, Field, FieldError, PhoneCountryInput, QuantityStepper, Toaster; `components/layout`). Primero se adaptan al estilo A y después se usan en las páginas.
- **No mezclar fases.** Si en una fase se ve un problema de otra área, se anota aquí y se arregla en su fase (salvo que bloquee).
- **No commitear secretos** ni datos reales de clientes en tests o capturas.

---

## 3. Reglas para todas las pantallas

Sirven para todas las pantallas, y para decidir cuando el mockup no dice algo. Si una regla choca con una nota de un tablero, manda la nota del tablero. Si choca con la API, manda la API, y se anota.

### 3.1 Validaciones

- Se valida **en la web y en la API**. La web nunca confía solo en sí misma; la API es la que manda.
- Cada campo valida **al salir del campo** y **al enviar**. No mostrar errores mientras la persona todavía escribe por primera vez.
- El mensaje va **debajo del campo**, en rojo, unido con `aria-describedby`, y el campo se marca con borde rojo. Arriba del formulario va un resumen ("Revisa 2 campos") que lleva al primero.
- Los mensajes dicen **qué hacer**, en español simple y en tú: "Escribe al menos 3 letras", "El porcentaje no puede superar 100". Nunca "Error de validación" ni textos en inglés de la API.
- Los errores **409** (repetido: SKU, código, nombre, prefijo, slug, lugar) y **422** de la API se muestran **en su campo**, no solo en un aviso.
- El botón de guardar queda deshabilitado **mientras se guarda** (y con spinner en el botón). Si hay errores, se deja tocar y se muestra el resumen, salvo donde la nota del tablero diga otra cosa (por ejemplo, Ajustar stock).
- **Montos**: aceptar coma o punto ("30,50" y "30.50"), hasta 2 decimales, máx. 12 dígitos, y enviar con punto. Mostrar siempre como `Bs 1.234,50`. Usar un único `MoneyInput`, `parseMoney` nuevo y el `formatCurrency` que ya existe en `lib/format/currency.ts`.
- **Números enteros** (stock, cantidades, días): solo dígitos, `inputmode="numeric"`.
- **Fechas**: en la zona horaria de la tienda, no la del equipo. Rango "desde" ≤ "hasta", máx. 90 días donde aplique y no antes del primer día de la tienda.
- **Teléfono**: `PhoneCountryInput`, +591 por defecto, solo números.
- **Textos**: recortar espacios al inicio y al final antes de validar y de enviar. Respetar los máximos de la API y mostrar el contador cuando el límite es corto (140 o 280).
- **Archivos**: JPG/PNG/WebP hasta 5 MB y CSV hasta 5 MB. Revisar tipo y tamaño antes de subir.

### 3.2 Manejo de errores por respuesta

| Respuesta | Qué ve la persona |
|---|---|
| 400 / 422 | Error en el campo que corresponde; si no hay campo, aviso arriba del formulario con el mensaje de la API traducido. |
| 401 | Se intenta refrescar la sesión (`lib/auth/refresh`); si falla, se va a Entrar y se vuelve a la misma página después. |
| 403 | Página o tarjeta "No tienes permiso" (`ForbiddenState`) con el nombre del dueño si se puede. Si la tienda está suspendida, franja roja y solo lectura. |
| 404 | "No encontramos este producto/venta/pedido" con un botón para volver a la lista. Dentro del panel, nunca la 404 pública. |
| 409 | En su campo si es un dato repetido; si es un estado (venta ya anulada, caja ya abierta), aviso con el mensaje y se recarga el dato. |
| 429 | "Demasiados intentos. Espera unos minutos." Sin reintento automático. |
| 5xx / sin red | Tarjeta de error en el lugar del contenido con "Reintentar"; el resto de la página sigue usable. Si es al guardar, aviso con "Reintentar" y **no se pierde lo escrito**. |

Todos los errores inesperados se registran con `lib/observability` (sin datos personales).

### 3.3 Avisos, notificaciones y confirmaciones

- **Aviso corto** (toast, `sonner`): para resultados de una acción ("Producto creado", "Stock actualizado", "Venta anulada", "Guardado"). Arriba en escritorio; en el celular, abajo y por encima de la barra. Dura 4 segundos. Si se puede deshacer, lleva "Deshacer".
- **Franja fija arriba**: para estados que duran: sin conexión, sincronizando, ventas por revisar, prueba por vencer, tienda suspendida.
- **Aviso dentro de la página** (Alert): para algo que la persona debe saber antes de actuar ("Esta categoría está desactivada", "El stock cambió").
- **Confirmación** (ConfirmDialog): siempre antes de lo que no se deshace (anular, eliminar, desactivar, cerrar caja, descartar cambios, revocar invitación). El botón dice la acción ("Anular venta"), no "Aceptar". Lo peligroso va en rojo.
- **Salir con cambios sin guardar**: "¿Salir sin guardar?" al volver, al cambiar de página o al cerrar la pestaña.
- **Número rojo en Más**: pedidos sin responder (mismo dato que el de Inicio).
- No usar `alert()` ni `confirm()` del navegador.

### 3.4 Cargando, vacío y sin conexión

- **Cargando**: esqueletos con la forma del contenido; nunca una pantalla en blanco ni solo un círculo girando. Si tarda más de 10 s, mostrar "Esto está tardando…" con "Reintentar".
- **Vacío**: explica qué hacer y ofrece la acción principal (crear, importar, compartir el catálogo). Con filtros: "Ningún resultado con estos filtros" + "Limpiar filtros".
- **Sin conexión**: Vender funciona con lo guardado en el equipo. Las páginas que necesitan internet muestran "Sin conexión" con acceso a Vender. Al volver: "Sincronizando…" y la franja se va.

### 3.5 Permisos

- La pantalla se arma con `lib/auth/permissions.ts`. No se esconde con CSS: lo que el cajero no puede usar no se dibuja.
- Cada ruta solo de dueño también se protege del lado del servidor (si el cajero entra por la URL ve "No tienes permiso").
- La API es la última barrera. Si la web muestra algo por error, la API lo rechaza (403) y se ve el estado de permiso.

### 3.6 Navegación y diseño

- Celular: una sola `MobileTabBar` (tablero P00), con la página actual marcada con fondo. Desde Más queda marcado Más y el título muestra "Más › Página".
- Escritorio: barra lateral; tablet: barra angosta. Las ventanas en celular son hojas desde abajo; en escritorio, ventanas centradas.
- Filtros, orden y página van en la URL (se puede compartir y volver con el botón Atrás).
- Al volver a una lista se conserva el scroll y los filtros.
- Textos en tú, español de Bolivia, sin IDs técnicos ni inglés. Nombres: Inicio, Vender, Caja, Productos, Ventas, Pedidos, Reportes, Configuración, Venta actual, Lugares en la tienda, Dónde está, Categorías.

### 3.7 Accesibilidad

- Toques de 44 px o más (52 px en la barra de abajo). Contraste AA.
- Cada campo con su etiqueta real. Errores unidos al campo.
- Ventanas y hojas con foco atrapado, Escape para cerrar y el foco vuelve al botón que las abrió.
- `aria-current="page"` en el menú, `aria-live` para avisos y para "Agregado: X" en Vender.
- Todo se puede hacer con teclado. Atajos de escritorio: `/` buscar, `F2` nueva venta, `F9` cobrar.

### 3.8 Seguridad y datos

- El costo y el margen no se muestran al cajero (y con B5 tampoco llegan desde la API).
- Nada sensible en la URL (solo filtros).
- Las acciones de dinero (venta, caja, anular) no se envían dos veces: botón bloqueado mientras se envía. Las ventas sin conexión se guardan con su id local (`pendingSales` en Dexie): en la Fase 4, agregar un test que confirme que reenviar la misma venta no la crea dos veces.

---

## 4. Errores encontrados en la web actual

Se arreglan en la **Fase 0** porque son chicos, no dependen del rediseño y ya molestan hoy.

| Id | Error | Dónde | Arreglo | Test |
|---|---|---|---|---|
| **E1** | Los montos solo aceptan punto; en Bolivia se escribe con coma ("30,50"). | `features/store-day/schemas.ts` (`validateMoneyAmount`, `moneyValue`) | Aceptar coma o punto y enviar con punto. Luego el mismo `parseMoney` para todos los montos (producto, descuentos, cobro). | unit: "30,50", "30.50", "1.234,50" rechazado o aceptado según la regla, "0", vacío. |
| **E2** | Anular un movimiento de caja dice "Razón (opcional)", pero la API la exige; cuando se dejaba vacía, la web mandaba "Anulado desde Ajustes" en su lugar. | `features/store-day/components/CashMovementRow.tsx` | Campo requerido, con error en el campo. | unit + e2e de anular sin razón. |
| **E3** | `validateMoneyAmount` rechaza 0 siempre ("debe ser mayor a 0"), pero la apertura de caja y el efectivo contado **pueden ser 0** (la API acepta `ge=0`). Hoy no se puede abrir la caja con Bs 0. | `features/store-day/schemas.ts` y `actions.ts` (apertura y cierre) | Separar "mayor a 0" (movimientos) de "0 o más" (apertura y contado). | unit: apertura 0 válida; movimiento 0 inválido. |
| **E4** | El precio con descuento no llega sin conexión: `POST /sync/pull` no manda `discount_type`, `discount_value` ni `discount_ends_at`, aunque `syncEngine` los lee. | backend sync | **B1** | integración: pull trae los tres campos. |
| **E5** | El cajero recibe `cost_price` en la API aunque la web no lo muestre. | backend products | **B5** (si se decide) | integración: cajero no recibe `cost_price`. |
| **E6** | Pedidos se filtran en la web sobre los últimos 50; con más pedidos, los contadores y las pestañas mienten. | `GET /storefront-requests` | **B7** | integración: filtro y conteo por estado. |
| **E8** | `Button` era componente de cliente: una página del servidor con `<Button asChild><Link/></Button>` (Reportes, 404, estados vacíos) se caía con "React.Children.only expected…", porque el hijo llegaba como referencia del servidor. Por eso fallaban Reportes y sus e2e. | `components/ui/Button.tsx` | Arreglado en la Fase 1: `Button` ya no lleva `"use client"` (no usa hooks). | e2e de Reportes y smoke en verde. |
| **E7** | Tests e2e que ya fallan en `main` (9 al probar el 2026-11-11 sin `.env.local`): `a11y` (rutas principales), `auth` (sesión simulada llega a Productos), `pos` (render), `products` (vacío y validación al crear), `reports` (los 3) y `smoke` (rutas principales). Fallan por textos y enlaces que cambiaron y por tiempos de `next dev`. | `apps/web/e2e/` | Rehacerlos en la Fase 1 junto con los nombres nuevos del menú, y desde ahí cada fase deja sus e2e en verde. | La rama no agrega fallas: 7 de esos 9 siguen fallando, ninguna nueva. |

También se corrigió en los mockups: la nota de Reportes (P08) decía "anular movimiento con razón opcional". Ahora dice obligatoria, igual que Caja (P09) y la API.

---

## 5. Decisiones pendientes

Resolverlas antes de la fase indicada. Mientras no se decidan, se hace lo recomendado.

| Id | Decisión | Recomendación | Antes de |
|---|---|---|---|
| D1 | Barra de abajo: "Más" fijo y marcado, o variante que muestra la página abierta. | Más fijo (ver P00). | Fase 1 |
| D2 | Hacer **B4** (aviso de vencimiento por defecto, migración 040). | Sí, es ½ día y evita escribir el número en cada lote. | Fase 0 |
| D3 | Hacer **B5** (no enviar costo al cajero). | Sí, es 1 h y cierra una fuga de datos. | Fase 0 |
| D4 | Hacer **B6** (nombre de quién vendió / anuló). | Sí, útil para control con cajeros. | Fase 0 |
| D5 | Mostrar el precio del plan en Plan y pagos (la API no lo da). | No por ahora; agregarlo después a `/billing/status`. | Fase 7 |
| D6 | SMTP con Brevo para confirmar cuenta, recuperar contraseña e invitar. | Configurarlo antes de publicar la Fase 8; mientras, en desarrollo se muestra el link. | Fase 8 |
| D7 | Textos "pedir otro en 60 s" y "vence en 1 hora" de recuperar contraseña. | Revisar la configuración real de Supabase Auth y mostrar esos valores. | Fase 8 |

---

## 6. Fases, en orden

| Fase | Qué | Días | Depende de | Tableros |
|---|---|---|---|---|
| 0 | Preparación: errores E1–E3, backend B1–B7, tipos | 2 | — | README (backend), P09 |
| 1 | Base: estilo A, navegación, componentes, estados | 2 | 0 | P00, P14, A · Más, A · Inicio (barra) |
| 2 | Caja y Inicio | 1,5 | 1 | P09, A · Caja, A · Inicio |
| 3 | Productos | 3 | 1 (B2, B4, B5) | P01, P01B, P02, P03, P04, P05, A · Productos |
| 4 | Vender | 2,5–3 | 2, 3 (B1) | A · POS (5), nota "posInventario", P14 |
| 5 | Ventas y Pedidos | 2 | 4 (B6, B7) | P06, P07 |
| 6 | Reportes | 1,5 | 2 | P08 |
| 7 | Configuración | 2 | 1 (B3) | A · Configuración, P10, P11, P12 |
| 8 | Acceso | 1 | 1, D6 | P13 |
| 9 | Revisión final | 1,5 | todas | todos |

**Total: unos 19 días de trabajo** (17–18 del README más la Fase 0, que adelanta el backend y los arreglos). Las fases 1, 2 y 4 ya cambian el día a día. El orden evita problemas porque:

- Caja va antes de Vender, porque Vender con la caja cerrada lleva a abrir caja.
- Productos va antes de Vender, porque Vender muestra "Dónde está", descuentos y lotes.
- Pedidos va después de Vender, porque "Cobrar en Vender" usa el Vender nuevo.
- Configuración va al final, porque se usa poco y casi no cambia la API.

### Fase 0 · Preparación (2 días)

**Objetivo:** que el backend tenga todo lo que la web nueva va a pedir y arreglar los errores que ya molestan.

Backend (cada uno con test en `apps/backend/tests/integration/`, Ruff y su entrada en el OpenAPI):

1. **B1**: `discount_type`, `discount_value` y `discount_ends_at` en el payload de productos de `POST /sync/pull`.
2. **B2**: `GET /products` con filtro `stock=expiring` (lotes con unidades y `alert_on ≤ hoy` en la zona de la tienda) y campo `next_expiry` en cada producto de la lista. Vender no lo muestra, así que `/products/pos` no cambia.
3. **B3**: `last_login_at` en `UserResponseDTO` (el dato ya existe en la entidad).
4. **B4** (si D2 = sí): migración **040** `stores.default_alert_days` (0–365, default 5), en `GET/PATCH /store`, usado como aviso inicial al crear producto, ajustar stock e importar CSV cuando no se manda `alert_days`. Probar `alembic upgrade head` y `downgrade`.
5. **B5** (si D3 = sí): no enviar `cost_price` a cajeros en productos (lista, detalle, POS, sync pull). Revisar que la app móvil no lo necesite para el cajero.
6. **B6** (si D4 = sí): `created_by_name` y `voided_by_name` en `SaleResponseDTO`, con una sola consulta por página. La venta no guardaba quién la anuló: necesita la migración **041** `sales.voided_by_user_id` (las anuladas antes quedan sin nombre).
7. **B7**: `GET /storefront-requests?status=` y conteo por estado en la respuesta.
8. Exportar OpenAPI y commitear `openapi.json`.

Web (en la UI actual, se publica ya):

9. **E1**, **E2**, **E3** con sus tests. Además, la parte web de **B1**: guardar `discount_ends_at` en Dexie y no aplicar un descuento vencido aunque el último sync sea anterior a su fecha.
10. Crear `parseMoney` en `lib/format/currency.ts`, junto al `formatCurrency` que ya existe, y usarlo en E1.

Publicar el backend antes que la web. Confirmar en staging que la web actual y la app móvil siguen funcionando.

### Fase 1 · Base y navegación (2 días)

**Objetivo:** el marco nuevo para todas las páginas, sin cambiar todavía su contenido.

1. Tokens del estilo A en Tailwind (colores, radios, sombras, tipografía Inter, números tabulares).
2. `navigation.ts`: nombres nuevos (Inicio, Vender, Caja, Productos, Ventas, Pedidos, Reportes, Configuración), con Caja nueva y el mismo control de permisos.
3. Escritorio: `AppSidebar` nuevo (tienda y plan, "Nueva venta" F2, menú, tarjeta de caja). Tablet: barra angosta. Vender: barra angosta también en escritorio.
4. Celular: `MobileTabBar` (P00), con la página actual marcada con fondo y reglas de dónde se oculta. Página **Más** (A · Más) con Caja, Pedidos (número), Reportes, Configuración (solo dueño), Ayuda, Mi perfil y Cerrar sesión. Reemplaza a `MobileNavDrawer`.
5. Encabezado de página con la ruta corta ("Más › Pedidos") y flecha de volver en celular.
6. Componentes adaptados: Button, Field, Input, Select, Dialog → `Sheet` en celular, ConfirmDialog, EmptyState, ErrorState, ForbiddenState, Skeleton, Toaster (posición según pantalla), `MoneyInput`, `useUnsavedChangesGuard`.
7. Franjas: sin conexión / sincronizando / ventas por revisar (con `SyncConflictsDialog`), prueba por vencer (`TrialBanner`), tienda suspendida.
8. Páginas de estado: sin permiso, 404 dentro del panel, "Sin conexión".
9. Actualizar los tests que buscan los textos viejos del menú ("Dashboard", "POS", "Solicitudes", "Ajustes") y los e2e de navegación.

Aceptación: todas las páginas actuales se ven dentro del marco nuevo y se puede llegar a todas desde escritorio y celular, como dueño y como cajero.

**Hecho (2026-11-11).** Notas para las fases siguientes:

- Tokens del estilo A solo dentro de `.theme-app` (panel y acceso): el catálogo público y la landing no cambian. Los colores `brand-*` son variables CSS; botones y campos usan `rounded-control`, `h-control` y `rounded-card`. Fuente Inter en `src/fonts` (OFL).
- Rutas nuevas: `/dashboard/mas` (pantalla Más) y `/dashboard/caja` (por ahora reúsa el panel de jornada actual; la Fase 2 la rehace y saca "Operación diaria" de Configuración).
- `MobileTabBar` se oculta solo donde la página tiene su propia barra fija: hoy solo la impresión del recibo. **Cada fase agrega sus rutas** en `ROUTES_WITHOUT_TAB_BAR` (`navigation.ts`) cuando su barra exista: Vender (4), formularios de producto (3), detalle de venta (5).
- Más todavía no tiene Ayuda ni Mi perfil (no hay páginas): se agregan en la Fase 7; mientras, Más muestra la cuenta y "Cerrar sesión".
- El marco carga en el servidor los pedidos sin responder y el estado de la caja (`loadShellStatus`); si la API no responde, se muestra sin esos datos.
- Barra angosta de 96 px (para que "Configuración" entre sin cortarse) en tablet y en Vender.
- Avisos (`Toaster`): arriba a la derecha en escritorio, abajo sobre la barra en el celular.
- Correr e2e en local con `--workers=1`: con varios Chromium y `next dev` en paralelo Docker se queda sin memoria (3,7 GB) y el servidor se cae ("connection refused").

### Fase 2 · Caja y Inicio (1,5 días)

1. Página **`/dashboard/caja`** (P09): estado, abrir (con "Igual que ayer"), movimientos (tipos, entrada o salida), anular con razón, vista previa del cierre ("Debería haber"), cerrar (contado o sin contar), reabrir. Mueve lo de Ajustes › Operación diaria. Montos con `MoneyInput` (coma y punto, 0 permitido en apertura y contado).
2. Al cerrar: aviso "Caja cerrada" y abrir el resumen del cierre.
3. **Inicio** (A · Inicio): ventas de hoy con comparación con el mismo día de la semana pasada, tickets y promedio, artículos, cómo te pagaron, "Necesita atención" (lotes por vencer, stock bajo, pedidos), últimas ventas, tarjeta de caja, buscador Ctrl K, periodo Hoy / 7 días / Mes.
4. Cajero: ve si la caja está abierta, sin montos ni botones.

### Fase 3 · Productos (3 días)

1. Lista (P01): tarjetas en celular, tabla en escritorio, chips de stock (con "Por vencer" de B2), categoría, orden, paginación de 50, filtros en la URL, búsqueda con 400 ms y Enter, código exacto + Enter abre el producto, menú ⋯ (celular) y botón ⋯ (escritorio).
2. Pestañas **Categorías** y **Lugares en la tienda** (P01B) con sus rutas, hojas y ventanas, desactivar con confirmación, eliminar lugar avisando a cuántos productos se les quita.
3. **Aviso de vencimiento** (P01B, B4). Si B4 no se hizo, la opción no aparece.
4. Formulario nuevo / editar (P02): todas las validaciones, errores 409 en su campo, "+ Nueva categoría" y "+ Nuevo lugar" sin salir, foto con cámara, SKU automático con aviso, margen, "Así se ve al vender", "¿Salir sin guardar?".
5. Detalle (P03): stock, lotes (Vencido / Por vencer / Vigente), Dónde está, movimientos, "En el catálogo", Duplicar, Ver QR; sin costo para el cajero.
6. Ventanas (P04): Ajustar stock (Agregar con lote / Descontar de un lote, razones rápidas, "Stock después"), Dónde está (hasta 6), Eliminar (escribir ELIMINAR), QR, cámara.
7. Etiquetas e Importar CSV (P05): 3 pasos en celular, todo o nada en el CSV, errores por fila descargables.

### Fase 4 · Vender (2,5–3 días)

Es la fase más delicada: es lo que más se usa y funciona sin conexión.

1. Buscar (3+ letras, también sin conexión), lector USB + Enter, cámara, resultados con stock, precio, código y Dónde está; "Sin stock" bloqueado.
2. "Agregado: X" con Deshacer; más vendidos (guardados para usar sin conexión).
3. Venta actual: +/−, escribir cantidad con tope de stock, quitar, vaciar, "El stock cambió · Ajustar a N".
4. Cobro: descuento de producto, descuento manual dentro de la política, "Qué descuento aplicar" con permiso, 4 métodos, recibido y cambio, cliente opcional.
5. "Venta lista": Nueva venta, Imprimir (si no hay conexión, recibo con datos locales o botón deshabilitado hasta enviar), WhatsApp.
6. Celular: barra fija "Ver venta · Cobrar" en lugar de la barra de abajo, × para salir. Escritorio: atajos `/`, `F2`, `F9`.
7. Sin conexión: venta guardada en Dexie y enviada al volver; pendientes y conflictos en la franja. Precio con descuento correcto gracias a B1.
8. Caja cerrada: pantalla que lleva a abrir caja (dueño) o explica (cajero).
9. Recorrer la nota "Todo lo que hace hoy el POS" del lienzo punto por punto antes de cerrar la fase.

### Fase 5 · Ventas y Pedidos (2 días)

1. Ventas (P06): lista por día con total, filtros de fecha y estado, detalle al costado (escritorio) o página (celular), recibo (80 mm) y WhatsApp, anular con razón (solo dueño, 409 si ya está anulada), exportar. Quién vendió y quién anuló con B6.
2. Pedidos (P07): pestañas por estado con conteo (B7), detalle, WhatsApp con sugerencia de pasar a "Contactado", pago recibido, **Cobrar en Vender** (carga productos y cliente, avisa los que no tienen stock o se borraron, al terminar ofrece "Cerrar pedido").

### Fase 6 · Reportes (1,5 días)

1. P08: rango compartido (máx. 90 días), ventas con comparación, por método con cantidad, más vendidos, cierres con diferencia (Cuadra / falta o sobra / Sin conteo), movimientos de caja y de stock, descargas CSV.
2. Cajero: solo Ventas y Movimientos de stock.

### Fase 7 · Configuración (2 días)

1. Índice (A · Configuración, P10) con buscador y tres grupos. Escritorio: menú de Configuración + sección.
2. Datos de la tienda (logo = logo del catálogo, zona horaria solo lectura, teléfono +591), Precios y descuentos.
3. Usuarios y permisos: lista, Último ingreso (B3), invitar, hacer / quitar dueño, desactivar / activar, reenviar / revocar, regla del último dueño.
4. Catálogo público (P11): partes con resumen y vista previa, todas sus validaciones, imágenes.
5. Plan y pagos y Mi perfil (P12).
6. Redirigir cualquier enlace viejo a Categorías o Ubicaciones dentro de Configuración hacia Productos.
7. Cambio de texto "Tu boleta" → "Tu pedido" en las plantillas del catálogo (Vitrina y Lista).

### Fase 8 · Acceso (1 día)

1. P13: entrar (Google siempre pide la cuenta), crear tienda, recuperar contraseña (mismo mensaje exista o no la cuenta), nueva contraseña, aceptar invitación.
2. Requisitos de la contraseña marcados mientras se escribe, 429 con su mensaje.
3. Después de entrar: dueño → Inicio; cajero → Vender si la caja está abierta, si no Inicio.
4. Depende de D6 (SMTP) y D7.

### Fase 9 · Revisión final (1,5 días)

1. 375, 768 y 1280 px en todas las páginas; celular real con lector de códigos y cámara.
2. Dueño y cajero en todas las páginas, también entrando por URL.
3. Sin conexión: vender, volver, sincronizar, conflicto.
4. Accesibilidad: teclado, lector de pantalla, contraste, foco en ventanas (`e2e/a11y.spec.ts`).
5. Capturas de referencia nuevas (`e2e/visual-baseline.spec.ts`).
6. Lista de paridad completa.
7. Rendimiento: Vender y Productos rápidos en un celular de gama baja.

---

## 7. Lista de paridad: lo que hoy funciona y no se puede perder

Se marca en la fase que toca cada área.

- **Vender**: búsqueda sin conexión, lector USB, cámara, tope de stock, conflictos de stock, descuentos de producto y manuales, permiso de elegir descuento, 4 métodos de pago, cliente, ventas sin conexión con envío y revisión de rechazadas, tienda cerrada.
- **Productos**: foto (subir, quitar, optimizar), SKU automático por categoría, código QR (ver y descargar SVG), lotes y FEFO, retirar lote, Dónde está (hasta 6, exhibición o depósito), eliminar lógico, etiquetas (tamaños, hoja Carta/A4, margen, configuración recordada), importar CSV (todo o nada, `vence` y `aviso_dias`), exportar CSV.
- **Ventas**: filtros, detalle, anular, impresión de 80 mm, exportar.
- **Pedidos**: estados, pago recibido, WhatsApp con el pedido armado, pedidos antiguos de un solo producto.
- **Caja**: abrir, cerrar con o sin conteo, reabrir el mismo día, movimientos y anulación, historial de eventos.
- **Reportes**: ventas, cierres y su página, movimientos de caja y de stock, descargas.
- **Configuración**: datos de la tienda, política de descuentos, catálogo completo (plantilla, colores, logo, portada, QR de pago, destacados, orden, WhatsApp, horario, mapa), usuarios e invitaciones, plan y pago por WhatsApp.
- **Cuenta**: Google con selector de cuenta, recuperar contraseña, invitaciones, prueba gratis y su franja, suspensión.
- **App**: PWA instalable, service worker sin interceptar imágenes de Cloudinary ni el catálogo, favicon e ícono, página offline.

---

## 8. Cómo verificar

Backend (`apps/backend`):

```bash
py -m pytest tests -q -p no:cacheprovider
```

```bash
py -m ruff check src tests --no-cache
```

```bash
py -m alembic upgrade head
```

Web (`apps/web`):

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm test
```

```bash
pnpm build
```

```bash
pnpm test:e2e
```

Manual en cada fase: celular (375), tablet (768) y escritorio (1280); dueño y cajero; con y sin conexión. Las capturas van en el PR.

---

## 9. Registro

| Fecha | Cambio |
|---|---|
| 2026-11-11 | Primera versión. E3 encontrado al revisar el código (apertura y contado en 0). Nota de P08 corregida (razón obligatoria al anular un movimiento de caja). |
| 2026-11-11 | Fase 1 hecha: marco, navegación, Más, Caja provisoria, franjas y estados. E8 encontrado y arreglado (Button en páginas del servidor). Los e2e que fallaban en `main` (E7) pasan con los nombres nuevos. |
| 2026-11-11 | Fase 0 hecha en la rama `feat/ui-redesign-option-a`. D2, D3 y D4 se hicieron como se recomendaba (B4, B5 y B6 sí). B6 necesitó la migración 041. B2 solo en `GET /products`. `openapi.json` estaba desactualizado y se regeneró. La web no usa tipos generados. |
