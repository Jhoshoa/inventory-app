# Rediseño de la UI: opción A "Mostrador"

Versión elegida para implementar. Los mockups están en el lienzo "Tu Tiendamiga · Propuestas de UI admin y cajero":

- Fila **A · Mostrador**: Inicio y Productos (celular), Inicio (escritorio).
- Fila **A · Mostrador — Configuración reorganizada**: índice, Datos de la tienda, Usuarios y permisos, menú Más, Caja (celular).
- Fila **A · Mostrador — POS (vender)**: buscar, venta actual, cobro, venta lista (celular) y Vender (escritorio).
- Sección **A · Todas las páginas (para implementar)**: tableros P00–P14 (P00 = navegación en el celular; P01B = Categorías, Lugares en la tienda y aviso de vencimiento), uno por página, cada uno con celular, escritorio, ventanas y una nota con caminos, validaciones, permisos y API.

Las filas B y C del lienzo son las opciones que no se eligieron; no se implementan.

Copia del lienzo en el repo: [`mockups/`](mockups/) (un archivo `.dc.html` por tablero y `canvas.json` con la posición, el orden y las notas). Son el código fuente de los tableros: necesitan el visor del lienzo para verse como en el link, pero se pueden leer para copiar textos, datos de ejemplo, validaciones y notas. Si el lienzo cambia, volver a bajar los archivos.

En este documento cada dato lleva su origen:

- **Existe**: hay endpoint y la web ya lo usa o puede usarlo tal cual.
- **Solo web**: se resuelve en el frontend con endpoints que ya existen.
- **Backend Bn**: hace falta un cambio en la API (ver [Cambios de backend](#cambios-de-backend)).

## 1. Navegación y nombres

Las rutas no cambian: los enlaces guardados, la PWA instalada (`start_url: /dashboard`) y los tests de rutas siguen funcionando. Solo cambian los textos y el orden. Rutas nuevas: `/dashboard/caja`, `/dashboard/mas` (pantalla Más del celular), `/dashboard/products/categorias` y `/dashboard/products/lugares`.

| Hoy | Nuevo | Ruta | Por qué |
|---|---|---|---|
| Dashboard | **Inicio** | `/dashboard` | Español simple. |
| POS | **Vender** | `/dashboard/pos` | En Bolivia "el POS" es la máquina de tarjetas. |
| — | **Caja** | `/dashboard/caja` (nueva) | Abrir/cerrar caja y movimientos salen de Ajustes: es una tarea del día. |
| Productos | Productos | `/dashboard/products` | — |
| Ventas | Ventas | `/dashboard/sales` | — |
| Solicitudes | **Pedidos** | `/dashboard/solicitudes` | Es la palabra de todos los días. |
| Reportes | Reportes | `/dashboard/reports` | — |
| Ajustes | **Configuración** | `/dashboard/settings` | Así se llama en Android y en iPhone en español latinoamericano. |

Otros textos:

- En Vender, el carrito se llama **"Venta actual"** (botón "Ver venta"), no "boleta" (en Bolivia, boleta suena a boleta de pago o depósito).
- "Ubicaciones" pasa a **"Lugares en la tienda"** (ayuda: "Pasillo, estante, heladera, depósito…"). En cada producto el dato se llama **"Dónde está"**.
- "Categorías y SKU" pasa a **"Categorías"**, con la ayuda "El prefijo arma el SKU automático (LAC000001)".
- En el catálogo público, el panel del cliente pasa de "Tu boleta" a **"Tu pedido"**. Es un cambio de texto en las plantillas Vitrina y Lista, que ya están publicadas.

Estructura:

- **Escritorio** (≥ 1024 px): barra lateral fija con la tienda, "Nueva venta" (F2), el menú y la tarjeta de caja. En Vender la barra se angosta a íconos con nombre.
- **Tablet** (640–1023 px): barra angosta siempre; listas en tarjetas cuando las tablas no entran; detalle al costado en Ventas, Pedidos y Cierres.
- **Celular** (< 640 px): una sola barra abajo en todas las pantallas que la llevan: `Inicio · Productos · Vender (central) · Ventas · Más`. La página actual se marca con un fondo en forma de píldora detrás del ícono (#DCE6FF) y texto azul en negrita; las páginas que se abren desde Más dejan marcado **Más** y su título muestra la ruta ("Más › Pedidos"). No se muestra en Vender (la reemplaza "Ver venta · Cobrar", con × para salir), en formularios con botón fijo abajo, en Entrar/crear tienda ni en la cámara. Reglas completas en el tablero **P00**. "Más" tiene Caja, Pedidos, Reportes, Configuración, Ayuda, Mi perfil y Cerrar sesión. Las ventanas son hojas que suben desde abajo.
- **Variante pendiente de decidir**: que el último botón muestre la página abierta desde Más ("Pedidos") y vuelva a "Más" al cambiar de pestaña. Se recomienda no hacerlo (los botones cambian de nombre y no queda claro si tocarlo abre la página o el menú); está dibujada en P00 por si se prefiere.
- **Cómo se llega en el celular** (dueño):
  - Productos: pestaña **Productos** abajo. Arriba a la derecha, **⋯** abre "Más acciones": Importar, Imprimir etiquetas, Descargar lista, **Categorías**, **Lugares en la tienda** y **Aviso de vencimiento** (P01, P01B). En escritorio: pestañas Categorías y Lugares, y botón ⋯ con Descargar lista y Aviso de vencimiento.
  - Configuración: pestaña **Más → Configuración**. Grupos Tu negocio, Ventas en línea y Equipo y cuenta; cada fila abre su pantalla con "Volver a Configuración": Datos de la tienda (A · Datos de la tienda), Precios y descuentos y Usuarios y permisos (P10), Catálogo público (P11), Plan y pagos y Mi perfil (P12).
  - Caja, Pedidos, Reportes y Ayuda también están en **Más**.
- **Cajero**: Inicio, Vender, Productos (solo ver), Ventas (sin anular ni exportar), Pedidos, Reportes básicos (ventas y movimientos de stock), estado de la caja (sin abrir/cerrar), Mi perfil. Sin Configuración ni movimientos de efectivo. Coincide con `lib/auth/permissions.ts`.

Backend: ninguno.

## 2. Índice de páginas

| Página | Ruta | Mockups |
|---|---|---|
| Inicio | `/dashboard` | A · Inicio (celular, escritorio) |
| Vender | `/dashboard/pos` | A · POS (4 celular + escritorio) |
| Caja y jornada | `/dashboard/caja` (nueva) | A · Caja (celular), P09 |
| Productos | `/dashboard/products` | A · Productos (celular), P01 |
| Productos › Categorías · Lugares en la tienda | `/dashboard/products/categorias` · `/dashboard/products/lugares` (nuevas) | P01B |
| Nuevo / editar producto | `/dashboard/products/new`, `/[id]/edit` | P02 |
| Detalle de producto | `/dashboard/products/[id]` | P03, ventanas P04 |
| Etiquetas · Importar CSV | `/dashboard/products/labels` · ventana | P05 |
| Ventas · detalle · recibo | `/dashboard/sales`, `/[id]`, `/[id]/print` | P06 |
| Pedidos | `/dashboard/solicitudes` | P07 |
| Reportes (ventas, cierres, caja, stock, descargas) | `/dashboard/reports`, `/store-days`, `/store-days/[id]`, `/cash-movements`, `/stock-movements` | P08 |
| Navegación en el celular (barra de abajo) | todas | P00 |
| Configuración (índice y secciones) | `/dashboard/settings` | A · Configuración, P10, P12 |
| Catálogo público | `/dashboard/settings/catalogo` | P11 |
| Plan y pagos · Mi perfil | `/dashboard/settings/billing` · nueva sección | P12 |
| Entrar, crear tienda, recuperar, nueva contraseña, invitación | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/invite/[token]` | P13 |
| Estados (caja cerrada, sin conexión, vacío, error, carga, sin permiso, 404, suspendida) | todas | P14 |

`/auth/callback` (vuelta de Google) solo muestra "Entrando…" con el logo; no tiene mockup propio.

## 3. Inicio

| Elemento | Fuente | Estado |
|---|---|---|
| Ventas de hoy, cantidad, ticket promedio | `GET /dashboard/summary` | Existe |
| "↑ 12% vs. martes pasado" | segunda llamada a `/dashboard/summary` con el mismo día de la semana anterior | Solo web |
| Periodo Hoy / 7 días / Mes | `scope=today`, rango personalizado, `scope=month` | Existe |
| Artículos vendidos, cómo te pagaron | `GET /reports/sales` (`items_count`, `by_payment_method`) | Existe |
| Pedidos sin responder y el más antiguo | `GET /storefront-requests` (`pending_count`) | Existe |
| Lotes por vencer / vencidos, stock bajo, últimas ventas | `GET /dashboard/summary` | Existe |
| Caja abierta y efectivo esperado | `GET /store-day/current`, `/current/closing-preview` | Existe |
| Plan y días de prueba | `GET /billing/status` | Existe |
| Buscador de productos (Ctrl K) | `GET /products?q=` (3+ letras) | Solo web |

## 4. Vender

Se mantiene todo lo que hace hoy el POS:

- Búsqueda por nombre (3+ letras, también sin conexión), código + Enter (lector USB) y cámara.
- Resultados con stock, precio, código y "Dónde está"; "Sin stock" bloqueado; aviso de agregado.
- Venta actual con +/− y cantidad con tope de stock, quitar, y "el stock cambió · Ajustar a N".
- Descuento de producto, descuento manual dentro de la política y "Qué descuento aplicar" (con permiso).
- 4 métodos de pago y cliente opcional.
- Venta sin conexión con envío automático, pendientes y conflictos.

| Nuevo | Fuente | Estado |
|---|---|---|
| Barra fija "Ver venta · Cobrar Bs X" (celular) | estado local | Solo web |
| Más vendidos | `GET /reports/sales` (`top_products`, 30 días) + productos de Dexie; se guarda para usar sin conexión | Solo web |
| Deshacer el último agregado | estado local | Solo web |
| Recibido y cambio (efectivo) | cálculo local, no se guarda | Solo web |
| "Venta lista" con Nueva venta | respuesta de `POST /sales` o venta en Dexie | Solo web |
| Recibo: imprimir / WhatsApp | `/dashboard/sales/{id}/print`; texto `wa.me` | Existe / Solo web. Sin conexión no hay página de impresión: dibujar el recibo con datos locales o deshabilitar "Imprimir" hasta que se envíe |
| Atajos `/`, `F2`, `F9` | teclado | Solo web |
| Precio con descuento sin conexión | el sync no manda los campos de descuento | **Backend B1** |
| Cobrar un pedido del catálogo | Pedidos → "Cobrar en Vender" carga sus productos | Solo web |

## 5. Productos

| Elemento | Fuente | Estado |
|---|---|---|
| Lista, búsqueda, filtros (stock, categoría), orden, paginación | `GET /products` | Existe |
| Filtro "Por vencer" y columna "Vence" | — | **Backend B2** |
| Código exacto + Enter abre el producto | `GET /products/qr/{code}` | Solo web |
| Crear / editar, foto | `POST /products`, `PATCH /products/{id}`, `/photo` | Existe |
| Dónde está al crear | `PUT /products/{id}/locations` después de crear | Solo web |
| Lotes, movimientos y "Dónde está" del detalle | `/products/{id}/batches`, `/stock-movements`, `locations` | Existe |
| Pestañas **Productos · Categorías · Lugares en la tienda** (escritorio y tablet arriba; en el celular, dentro del menú ⋯) | rutas nuevas de la web | Solo web |
| Categorías: lista, nueva, editar, desactivar, próximo SKU | `GET/POST /product-categories`, `PATCH /{id}`, `POST /{id}/deactivate`, `next_sku_number` | Existe |
| Lugares en la tienda: lista con cantidad de productos, nuevo, editar, eliminar | `GET/POST /store-locations`, `PATCH`/`DELETE /{id}`, `product_count` | Existe |
| Aviso de vencimiento por defecto (celular: ⋯; escritorio: botón ⋯) | — | **Backend B4 (opcional)** |
| "+ Nueva categoría" y "+ Nuevo lugar" dentro del formulario y de la ventana "Dónde está", sin salir | `POST /product-categories`, `POST /store-locations` | Solo web |
| Ajustar stock (agregar con lote / descontar de un lote) | `PATCH /products/{id}/stock` | Existe |
| Eliminar, QR | `DELETE /products/{id}`, SVG en la web | Existe |
| Duplicar | abre "Nuevo" con datos copiados | Solo web |
| Ocultar costo al cajero | la API lo envía; se oculta en la web | Solo web (**B5 opcional** para ocultarlo en la API) |
| Etiquetas, importar CSV, descargar lista | página actual, `/products/import`, `/exports/products.csv` | Existe |

Notas de Categorías, Lugares en la tienda y aviso de vencimiento:

- Se usan al cargar productos, por eso viven en Productos y no en Configuración.
- Solo dueño: el cajero no ve las pestañas ni las entradas del menú ⋯, y si entra por la URL ve "No tienes permiso". `GET /product-categories` es solo dueño en la API.
- El cajero sí ve "Dónde está" en Vender y en el detalle (`GET /store-locations` acepta cualquier usuario activo).
- Al crear desde el formulario, la categoría queda elegida (y el aviso de SKU se actualiza) y el lugar queda marcado. Lo escrito en el producto no se pierde.
- Cambiar el prefijo de una categoría no cambia los SKU que ya existen. Las categorías no se borran, se desactivan; la API no tiene "volver a activar", así que "Desactivar…" pide confirmar.
- La API no da cuántos productos tiene cada categoría: la lista muestra el próximo SKU en su lugar.
- Backend: ninguno.

## 6. Ventas

| Elemento | Fuente | Estado |
|---|---|---|
| Lista por fechas y estado, detalle, anular, exportar | `/sales`, `/sales/{id}`, `/sales/{id}/void`, `/exports/sales.csv` | Existe |
| Totales del rango y por método | `GET /reports/sales` | Existe |
| Quién vendió / quién anuló | la venta trae solo ids | **Backend B6 (opcional)** |

## 7. Pedidos

| Elemento | Fuente | Estado |
|---|---|---|
| Lista, detalle, estado, pago, WhatsApp | `/storefront-requests`, `/{id}/status`, `/{id}/payment` | Existe |
| Pestañas por estado con conteo | hoy se filtra en la web sobre 50 | **Backend B7 (recomendado)** |
| Cobrar en Vender | `POST /sales` | Solo web |

## 8. Reportes

Ventas, cierres, movimientos de caja y de stock, y descargas salen de `GET /reports/sales`, `/store-day/reports`, `/store-day/reports/{id}`, `/cash-movements`, `/stock-movements` y `/exports/*.csv`. Todos existen.

## 9. Caja y jornada (página nueva)

Junta lo que hoy está en Ajustes › Operación diaria. Usa `GET /store-day/current`, `/current/closing-preview` y `/current/events`, `POST /store-day/open`, `/close` y `/reopen`, y `/cash-movements` (crear, listar y anular). Todos existen.

"Igual que ayer" (monto de apertura) sale de `GET /store-day/reports` y se resuelve en la web.

## 10. Configuración

Configuración queda con tres grupos: **Tu negocio**, **Ventas en línea** y **Equipo y cuenta**. El antiguo grupo "Inventario" desaparece: Categorías, Lugares en la tienda y el aviso de vencimiento por defecto pasan a Productos (sección 5). Un solo lugar para cada cosa, sin atajos repetidos.

| Sección | Fuente | Estado |
|---|---|---|
| Datos de la tienda (nombre, dirección, teléfono +591, logo = logo del catálogo, zona horaria solo lectura) | `GET/PATCH /store`, `/store/storefront-logo`, `/store-day/current` | Existe |
| Precios y descuentos | `PATCH /store` | Existe |
| Catálogo público | `PATCH /store`, imágenes del catálogo | Existe |
| Usuarios, invitaciones | `/users`, `/user-invitations` | Existe |
| "Último ingreso" | `last_login_at` no sale en la API | **Backend B3** |
| Plan y pagos | `/billing/status`, `/billing/history`, `/billing/checkout` | Existe (sin precio: la API no lo da) |
| Mi perfil (cambiar contraseña = correo de recuperación) | `POST /auth/forgot-password` | Existe (necesita SMTP) |
| Ayuda | página estática | Solo web |

## Validaciones

Se aplican en la web antes de enviar y la API las vuelve a validar. Los errores 409 de la API se muestran en su campo.

| Dónde | Regla |
|---|---|
| Búsquedas | 3+ letras. |
| Rangos de fechas | desde ≤ hasta; máx. 90 días; no antes del primer día de la tienda. |
| Producto | Nombre requerido, máx. 100; nombre + unidad únicos. Precio > 0. Costo ≥ 0. Stock inicial entero ≥ 0 (solo al crear). Avisar si baja de: entero ≥ 0 (1 si vacío). Unidad máx. 20 ("unidad"). SKU máx. 50, único. Código máx. 100, único. |
| Descuento de producto | % 0–100; Bs ≤ precio; dentro de la política de la tienda; "hasta" fecha futura y solo con descuento. |
| Lote | Fecha válida (2000–2100), solo al agregar y con cantidad > 0. Aviso 0–365 (5 por defecto, o el de B4). |
| Ajustar stock | Cantidad entera 1–1.000.000; descontar ≤ stock y ≤ lote elegido; razón requerida al descontar, máx. 120. |
| Foto e imágenes | JPG/PNG/WebP, máx. 5 MB, contenido de imagen real. |
| Eliminar producto | escribir "ELIMINAR". |
| CSV | .csv, máx. 5 MB y 5.000 filas; todo o nada; columnas `vence` (AAAA-MM-DD o DD/MM/AAAA) y `aviso_dias` (0–365). |
| Etiquetas | 1–100 por producto; margen en mm. |
| Anular venta | razón requerida, máx. 200; solo completadas y una vez. |
| Montos de caja | números con hasta 2 decimales, máx. 12 dígitos, ≥ 0; movimiento > 0. **Aceptar coma o punto** y enviar con punto. |
| Notas de caja | máx. 255. Cerrar: contado o "sin conteo", no ambos. |
| Anular movimiento de caja | razón requerida (la API la exige; **hoy la web la marca como opcional: corregir**). |
| Categoría | nombre requerido máx. 80; prefijo requerido máx. 8, letras y números, mayúsculas; ambos únicos. Igual en la pestaña y en "+ Nueva" del formulario. |
| Lugar en la tienda | zona requerida máx. 50; estante máx. 50; nivel máx. 30 y solo con estante; sin duplicados (sin importar mayúsculas). Hasta 6 por producto. Igual en la pestaña y en "+ Nuevo lugar". |
| Política de descuentos | % 0–100; cada opción necesita un máximo > 0. |
| Usuarios | correo válido; rol Cajero o Dueño; siempre queda al menos un dueño activo. |
| Tienda | nombre requerido máx. 100; dirección máx. 255; teléfono +591 por defecto, solo números, 8 dígitos en Bolivia. |
| Catálogo | slug: minúsculas, números y guiones, mín. 3, sin guion al inicio o final, requerido para encender, único. Colores #RRGGBB. Descripción e instrucciones de pago máx. 280. Anuncio máx. 140 (requerido si está encendido). Destacados ≤ 10. Dirección máx. 200. Link de Google Maps. Horario: apertura y cierre requeridos y distintos (puede cerrar después de medianoche). |
| Acceso | correo válido máx. 255; contraseña mín. 8 con mayúscula, minúscula, número y símbolo; nombres requeridos máx. 100; repetir contraseña igual. |

## Cambios de backend

Todos agregan campos o parámetros opcionales: no rompen la web actual ni la app móvil. Cada uno con tests en `tests/integration/`. **Estado: hechos los siete (Fase 0, rama `feat/ui-redesign-option-a`).**

| Id | Cambio | Para | Migración | Tamaño |
|---|---|---|---|---|
| **B1** | Agregar `discount_type`, `discount_value` y `discount_ends_at` al payload de productos de `POST /sync/pull`. `syncEngine` ya los lee, pero llegan vacíos. | Precio correcto sin conexión | No | ½ h |
| **B2** | `GET /products`: filtro `stock=expiring` (lotes con unidades y `alert_on ≤ hoy`) y campo `next_expiry`. | Chip "Por vencer", columna "Vence" | No | ½ día |
| **B3** | `last_login_at` en `UserResponseDTO`. | "Último ingreso" | No | 15 min |
| **B4** *(opcional)* | `stores.default_alert_days` (0–365, 5 por defecto) en `PATCH /store`, usado como aviso inicial en producto, ajuste y CSV. | Productos › ⋯ › Aviso de vencimiento | **Sí (040)** | ½ día |
| **B5** *(opcional)* | No enviar `cost_price` a cajeros en las respuestas de productos. | Ocultar el costo de verdad | No | 1 h |
| **B6** *(opcional)* | `created_by_name` y `voided_by_name` en `SaleResponseDTO`; la venta guarda quién la anuló (`voided_by_user_id`). | Quién vendió / anuló | **Sí (041)** | 2 h |
| **B7** *(recomendado)* | `GET /storefront-requests?status=` y conteo por estado. | Pestañas de Pedidos con muchos pedidos | No | 1 h |

Si no se hacen los opcionales, la pantalla se muestra sin ese dato (sin "Aviso de vencimiento" en Productos, sin nombre de cajero). Nada se rompe.

## Correcciones de la web que salieron al revisar

- Aceptar coma decimal en montos (hoy `validateMoneyAmount` solo acepta punto).
- Permitir 0 en la apertura de caja y en el efectivo contado (hoy `validateMoneyAmount` rechaza 0 siempre; la API lo acepta).
- Razón obligatoria al anular un movimiento de caja (la API ya la exige).
- Textos: Configuración, Venta actual, Pedidos, Vender, Inicio, "Tu pedido" en el catálogo, Lugares en la tienda, Dónde está, Categorías.

## Orden de implementación sugerido

El orden detallado, con la Fase 0 (backend y arreglos), las reglas para todas las pantallas, los errores E1–E6, las decisiones pendientes y la lista de paridad, está en [PLAN-DE-IMPLEMENTACION.md](PLAN-DE-IMPLEMENTACION.md). Este resumen queda como referencia de tamaños.

1. **Base** (2 días): tokens de la opción A, layout (barra lateral, barra angosta, pestañas, menú Más), nuevos nombres, franjas de estado (sin conexión, prueba, suspendida), estados vacíos, de error y de carga. B3.
2. **Inicio y Caja** (1,5 días): Inicio nuevo y página Caja con sus ventanas.
3. **Productos** (3 días): lista, filtros, formulario, detalle, ventanas, etiquetas, CSV, pestañas Categorías y Lugares en la tienda, crear sin salir del formulario. B2, B5 si se decide.
4. **Vender** (2,5–3 días): todo el POS nuevo, cobrar pedidos. B1.
5. **Ventas y Pedidos** (2 días): listas, detalle al costado, anular, recibo. B6 y B7 si se deciden.
6. **Reportes** (1,5 días): pestañas, cierres, movimientos, descargas.
7. **Configuración** (2 días): índice, secciones, catálogo con vista previa, plan, perfil. Categorías y Lugares ya no están aquí. B4 si se decide.
8. **Acceso** (1 día): entrar, crear tienda, contraseña, invitación.
9. **Revisión** (1,5 días): 375, 768 y 1280 px; dueño y cajero; sin conexión; accesibilidad (teclado, lectores de pantalla, contraste).

**Total estimado: 17–18 días de trabajo** (mover Categorías y Lugares suma ½ día a Productos y resta lo mismo a Configuración), con tests de web y backend en cada paso. Se puede publicar por fases: las fases 1, 2 y 4 ya cambian la experiencia diaria.

## Puntos a cuidar

- Los tests de la web que buscan textos del menú ("Dashboard", "POS", "Solicitudes", "Ajustes") se actualizan con los nombres.
- "Más vendidos" depende de `GET /reports/sales`: guardar la última respuesta en Dexie y mostrar la lista vacía (no un error) si nunca se cargó.
- Si hoy hay enlaces o anclas a Categorías o Ubicaciones dentro de Configuración, redirigirlos a `/dashboard/products/categorias` y `/dashboard/products/lugares`.
- Mover "Operación diaria" a Caja no cambia permisos: `canOpenCloseStore` y `canViewCashMovements` siguen siendo del dueño.
- El logo de "Datos de la tienda" es el mismo `storefront_logo_url` del catálogo: decirlo en la pantalla.
- Los correos (confirmar cuenta, recuperar contraseña, invitar) dependen del SMTP con Brevo, todavía pendiente.
- Accesibilidad: botones de 44 px o más, etiquetas reales en cada campo, errores unidos a su campo (`aria-describedby`), ventanas con foco atrapado y Escape para cerrar.
