# Inventory App — Guía Detallada de Funcionalidades

> **Versión:** 0.1.0 | **Estado:** MVP funcional | **Público objetivo:** Tiendas pequeñas y medianas en Bolivia

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Autenticación y Sesión](#2-autenticación-y-sesión)
3. [Dashboard / Panel Principal](#3-dashboard--panel-principal)
4. [Punto de Venta (POS)](#4-punto-de-venta-pos)
5. [Gestión de Productos](#5-gestión-de-productos)
6. [Impresión de Etiquetas](#6-impresión-de-etiquetas)
7. [Gestión de Ventas](#7-gestión-de-ventas)
8. [Jornada Laboral (Apertura y Cierre)](#8-jornada-laboral-apertura-y-cierre)
9. [Movimientos de Caja](#9-movimientos-de-caja)
10. [Reportes](#10-reportes)
11. [Exportaciones CSV](#11-exportaciones-csv)
12. [Gestión de Usuarios y Roles](#12-gestión-de-usuarios-y-roles)
13. [Configuración de Tienda](#13-configuración-de-tienda)
14. [Suscripción y Facturación](#14-suscripción-y-facturación)
15. [Sincronización Offline](#15-sincronización-offline)
16. [Importación Masiva de Productos (CSV)](#16-importación-masiva-de-productos-csv)
17. [Fotos de Producto](#17-fotos-de-producto)
18. [API de Salud (Health Checks)](#18-api-de-salud-health-checks)
19. [Métrica de la Aplicación](#19-métrica-de-la-aplicación)
20. [Tecnologías](#20-tecnologías)

---

## 1. Arquitectura General

### Multi-Tienda (Multi-tenant)

La aplicación está diseñada para que una sola instancia sirva a múltiples tiendas de forma aislada. Cada tienda tiene sus propios:

- Productos, categorías y SKU
- Ventas e ítems de venta
- Movimientos de stock y caja
- Jornadas laborales (apertura/cierre)
- Usuarios (dueño y cajeros)
- Tasas de cambio
- Configuración de suscripción

Un usuario de una tienda **no puede acceder** a datos de otra tienda. El aislamiento se aplica en cada consulta a base de datos.

### Roles

| Rol | Descripción |
|-----|-------------|
| **Owner** (Dueño) | Acceso total a todas las funcionalidades |
| **Cashier** (Cajero) | Acceso limitado a POS, consulta de productos, ventas y reportes |

### Stack

```
Frontend Web (Next.js 15)  ───HTTP──▶  Backend API (FastAPI)  ───SQL──▶  PostgreSQL
     │                                                                │
     │                   ┌────────────────────────────────────────────┘
     │                   ▼
     │           Cloudinary (fotos)
     │           Supabase Auth (producción)
     │           Sentry (monitoreo opcional)
```

---

## 2. Autenticación y Sesión

### Inicio de Sesión

- **Email + Contraseña**: formulario con validación client-side. La contraseña se verifica contra Supabase (producción) o contra hash PBKDF2 local (desarrollo).
- **Google OAuth**: botón "Continuar con Google" que inicia el flujo OAuth vía Supabase, con callback manejado en frontend y backend.
- **Sesión persistente**: 3 cookies httpOnly (`access_token`, `refresh_token`, `session`) con 8 horas y 30 días de vida respectivamente.
- **Refresh automático**: el API client renueva el token automáticamente al recibir un 401.

### Registro

- Formulario con nombre completo, nombre de tienda, email y contraseña.
- Crea el usuario y la tienda simultáneamente.
- En producción usa `supabase.auth.sign_up()`; en desarrollo crea usuario local con hash PBKDF2.
- Asigna automáticamente un período de prueba gratuito (trial).

### Cierre de Sesión

- Elimina las 3 cookies de sesión del lado del cliente.
- Redirige a la pantalla de login.

---

## 3. Dashboard / Panel Principal

Ruta: `/dashboard`

### Componentes del Dashboard

| Componente | Descripción |
|------------|-------------|
| **Métricas principales** | Tarjetas con Total de ventas, Cantidad de ventas, Ticket promedio, Cantidad de productos |
| **Selector de alcance** | Pestañas "Hoy" / "Mes" que recalculan todas las métricas |
| **Últimas ventas** | Tabla con las ventas más recientes (hasta 5) |
| **Stock bajo** | Lista de productos con `stock <= min_stock`, con enlace directo a productos |
| **Tasas de cambio** | Tabla de tipos de cambio (compra/venta) por fuente |
| **Estado de jornada** | Indicador de tienda abierta/cerrada con acciones rápidas de apertura y cierre |

### Datos que muestra

- Totales de ventas en **bolivianos (Bs)**
- Cantidad de productos registrados
- Productos con stock bajo
- Últimas 5 ventas (monto, método de pago, estado)
- Tasas de cambio activas

---

## 4. Punto de Venta (POS)

Ruta: `/dashboard/pos`

### Flujo de Trabajo

1. **Buscar producto**: campo de búsqueda con debounce. Busca por nombre o SKU. Si se ingresa un código QR exacto (Enter), lo busca directamente por QR.
2. **Resultados**: lista compacta mostrando nombre, precio, stock disponible y unidad. Botón "Agregar" por producto.
3. **Carrito de compras**: lista de productos agregados con nombre, precio unitario, cantidad (stepper +/– con input manual), subtotal por línea y subtotal general.
4. **Conflictos de stock**: si la cantidad supera el stock disponible, se muestra una advertencia visual (fondo rojo) en el ítem, pero permite continuar (la validación final ocurre en backend).
5. **Checkout**: formulario con:
   - **Método de pago**: Efectivo / QR / Transferencia / Tarjeta
   - **Nombre del cliente** (opcional)
   - **Resumen del carrito**: cantidad de ítems, subtotal, total
   - Botón "Confirmar Venta"

### Validaciones

- La tienda debe estar abierta (con jornada activa).
- El stock se valida en el backend dentro de una transacción.
- Si el stock es insuficiente, la venta se rechaza con mensaje de error.

### Métodos de Pago Soportados

| Método | Código | Descripción |
|--------|--------|-------------|
| Efectivo | `efectivo` | Pago en efectivo |
| QR | `qr` | Pago por código QR (transferencia) |
| Transferencia | `transferencia` | Transferencia bancaria |
| Tarjeta | `tarjeta` | Pago con tarjeta de crédito/débito |

---

## 5. Gestión de Productos

### Listado de Productos

Ruta: `/dashboard/products`

- **Búsqueda**: campo de texto con debounce que busca por nombre, SKU o código QR.
- **Filtros**:
  - Categoría (dropdown con todas las categorías activas)
  - Estado de stock: Todo / Disponible / Stock bajo / Sin stock
  - Ordenamiento: por nombre (A-Z, Z-A), precio (menor a mayor, mayor a menor), stock (más a menos, menos a más)
- **Paginación**: navegación página por página.
- **Tabla responsiva**: en desktop muestra columnas completas; en móvil se adapta a vista de tarjetas.
- **Acciones por producto**: Ver detalle, Editar, Ajustar stock, Eliminar.

### Crear Producto

Ruta: `/dashboard/products/new`

Formulario con los siguientes campos:

| Campo | Tipo | Detalle |
|-------|------|---------|
| Nombre | Texto | Requerido. Se normaliza a title case |
| Precio de venta | Número | Requerido, debe ser ≥ 0 |
| Costo | Número | Opcional |
| Stock inicial | Número | Requerido, debe ser ≥ 0 |
| Stock mínimo | Número | Opcional, para alerta de stock bajo |
| Unidad | Texto | Ej: unidad, kg, litro, metro |
| Categoría | Select | Lista de categorías activas. Al seleccionar, genera SKU automáticamente |
| Código SKU | Texto | Se autogenera desde la categoría, pero puede editarse manualmente |
| Código QR | Texto | Se genera automáticamente un UUID, puede editarse |
| Foto | Imagen | Subida opcional vía Cloudinary |

### Editar Producto

Ruta: `/dashboard/products/[productId]/edit`

Mismo formulario que creación, campos precargados. Permite cambiar cualquier campo excepto restricciones de unicidad.

### Detalle de Producto

Ruta: `/dashboard/products/[productId]`

Muestra:

- Información general (nombre, SKU, precio, costo, stock, stock mínimo, unidad, categoría)
- Foto del producto (con opción de subir/cambiar/eliminar)
- Código QR (con previsualización)
- Estado de stock (normal / bajo / sin stock)
- Historial de movimientos de stock (tabla con tipo, cantidad, stock resultante, razón, fecha)

### Acciones desde Detalle

- **Ajustar stock**: modal con campo de cantidad (+/–), razón obligatoria y fecha. Registra un movimiento de stock automático.
- **Subir foto**: selector de archivo con previsualización. Valida tipo MIME (JPEG, PNG, WebP), tamaño (máximo 5 MB) y firma mágica.
- **Eliminar producto**: eliminación lógica (soft-delete). Requiere escribir "ELIMINAR" para confirmar. El producto deja de aparecer en listados pero los datos históricos se conservan.

### Categorías de Productos

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre de la categoría (único por tienda) |
| Prefijo SKU | Prefijo de 2-4 caracteres usado para generar SKUs automáticos |
| Estado | Activa / Inactiva (no se pueden crear productos en categorías inactivas) |

Las categorías se gestionan desde Configuración → Categorías.

---

## 6. Impresión de Etiquetas

Ruta: `/dashboard/products/labels`

### Flujo de Trabajo

1. **Buscar productos** por nombre, con filtro de categoría y estado de stock.
2. **Seleccionar cantidades**: para cada producto, definir cuántas etiquetas imprimir.
3. **Configurar etiqueta**:
   - **Tamaño de página**: Carta (21.59 × 27.94 cm) o A4 (21.00 × 29.70 cm)
   - **Tamaño de etiqueta**: 6 tamaños predefinidos (desde 20×10 mm hasta 70×35 mm)
   - **Márgenes y espaciado**: margen superior, margen izquierdo, gap horizontal, gap vertical
   - **Datos visibles**: toggles para mostrar Nombre, Código (QR), SKU, Categoría, Precio
4. **Vista previa**: visualización en SVG de cómo se verán las etiquetas en la hoja.
5. **Descargar**: genera un archivo SVG listo para imprimir en navegador.

### Tamaños de Etiqueta

| Clave | Dimensiones |
|-------|-------------|
| 20×10 mm | 2.0 × 1.0 cm |
| 30×20 mm | 3.0 × 2.0 cm |
| 40×25 mm | 4.0 × 2.5 cm |
| 50×30 mm | 5.0 × 3.0 cm |
| 60×40 mm | 6.0 × 4.0 cm |
| 70×35 mm | 7.0 × 3.5 cm |

---

## 7. Gestión de Ventas

Ruta: `/dashboard/sales`

### Listado de Ventas

- **Filtros**:
  - Rango de fechas (selector con presets: Hoy, Ayer, Este mes, Mes pasado, Personalizado)
  - Estado: Todas / Completada / Anulada
- **Tabla**: fecha, cliente, subtotal, descuento, total, método de pago, ítems, estado (badge), acciones.
- **Paginación**: navegación entre páginas.

### Detalle de Venta

Ruta: `/dashboard/sales/[saleId]`

Muestra:

- Información general: fecha, método de pago, estado, cliente (si aplica)
- Tabla de ítems: producto, cantidad, precio unitario, subtotal
- Totales: subtotal, descuento, total
- Botón de **anular venta**: modal con campo de razón obligatorio. Al confirmar:
  - La venta se marca como anulada
  - El stock de cada producto se restaura automáticamente
  - Se registra un movimiento de stock tipo "sale_void"
  - Solo disponible para usuarios con rol **owner**

---

## 8. Jornada Laboral (Apertura y Cierre)

### Apertura de Caja

- Requiere ingresar **monto de caja inicial**.
- Se registra un evento de apertura con la fecha y hora.
- No se puede abrir si ya hay una jornada activa.

### Durante la Jornada

- **Estado**: indicador visible en Dashboard y Configuración mostrando que la tienda está abierta.
- **Eventos**: se registran eventos de apertura/cierre/re-apertura visibles en una línea de tiempo.
- **Movimientos de caja**: se pueden registrar ingresos y egresos durante la jornada.

### Cierre de Caja

**Vista previa** (antes de cerrar): muestra un resumen con:

| Dato | Descripción |
|------|-------------|
| Caja inicial | Monto con el que se abrió |
| Ventas totales | Suma de todas las ventas del día |
| Ventas completadas | Cantidad de ventas realizadas |
| Efectivo esperado | Caja inicial + ventas en efectivo + entradas de caja – salidas de caja |
| Desglose por método | Efectivo, QR, Transferencia, Tarjeta |
| Movimientos de caja | Total de entradas y salidas registradas |

**Cierre formal**: requiere ingresar el efectivo contado. Opcionalmente permite saltar el conteo de efectivo (cierre sin verificación). Al cerrar:

- Se calcula el efectivo esperado vs contado
- Se guarda un **snapshot completo** de:
  - Ventas del día (desglosadas por método de pago)
  - Movimientos de caja
  - Totales calculados
- Se registra un evento de cierre

### Reapertura

- Permite reabrir una jornada ya cerrada.
- Útil para corregir errores o registrar ventas pendientes.
- Se registra un evento de reapertura.

### Historial de Cierres

Ruta: `/dashboard/reports/store-days`

- Lista de cierres anteriores con filtro por fechas.
- Cada cierre muestra el snapshot completo de ese día.
- Acceso a detalle individual con todos los datos congelados al momento del cierre.

---

## 9. Movimientos de Caja

### Tipos de Movimiento

| Tipo | Código | Descripción |
|------|--------|-------------|
| Entrada | `cash_in` | Ingreso de efectivo no asociado a una venta |
| Salida | `cash_out` | Retiro de efectivo de la caja |
| Gasto | `expense` | Gasto operativo (servicios, compras) |
| Depósito | `deposit` | Depósito bancario desde la caja |
| Retiro | `withdrawal` | Retiro personal del dueño |

### Operaciones

- **Crear**: seleccionar tipo, ingresar monto y nota opcional. Requiere jornada abierta.
- **Listar**: tabla con filtros por tipo y rango de fechas.
- **Anular**: solo owner. Requiere razón. No elimina el registro, lo marca como anulado.

### Integración con Cierre de Caja

Al cerrar la jornada, los movimientos de caja se incluyen en el cálculo del efectivo esperado:
```
Efectivo esperado = Caja inicial + Ventas en efectivo + Entradas - Salidas
```

---

## 10. Reportes

### Reporte de Ventas

Ruta: `/dashboard/reports`

- **Filtro de fechas**: selector con presets (Hoy, Ayer, Este mes, Mes pasado, Personalizado).
- **Tarjetas de resumen**:
  - Total vendido (Bs)
  - Cantidad de ventas
  - Total de ítems vendidos
  - Ticket promedio
- **Desglose por método de pago**: tabla con barras de progreso mostrando total por método (efectivo, QR, transferencia, tarjeta).
- **Top productos**: tabla con los productos más vendidos en el período (nombre, cantidad, total).
- **Exportación**: botones para descargar CSV de ventas, productos, movimientos de stock y movimientos de caja (cada uno con sus respectivos filtros).

### Auditoría de Movimientos de Stock

Ruta: `/dashboard/reports/stock-movements`

- **Filtros**: rango de fechas, tipo de movimiento (sale, adjustment, sale_void, purchase), producto específico.
- **Tabla**: producto, tipo de movimiento, cantidad (+/–), stock resultante, razón, fecha.
- **Exportación CSV** con los mismos filtros.

### Historial de Movimientos de Caja

Ruta: `/dashboard/reports/cash-movements`

- **Filtros**: rango de fechas, tipo de movimiento (Todos, Entrada, Salida, Gasto, Depósito, Retiro).
- **Tabla**: tipo, monto, nota, fecha, estado (activo/anulado).
- **Exportación CSV**.

### Cierres de Jornada

Ruta: `/dashboard/reports/store-days`

- Lista de cierres con fecha, monto de apertura, ventas totales, efectivo esperado, efectivo contado.
- Detalle individual con snapshot completo del día.

---

## 11. Exportaciones CSV

Todas las exportaciones se generan desde el backend y se descargan como archivos CSV.

| Exportación | Contenido | Filtros |
|-------------|-----------|---------|
| Productos | Todos los productos activos de la tienda | Ninguno |
| Ventas | Ventas con ítems, método de pago, total | Rango de fechas |
| Movimientos de Stock | Tipo, cantidad, producto, razón | Rango de fechas, tipo, producto |
| Movimientos de Caja | Tipo, monto, nota, estado | Rango de fechas, tipo |

Se accede desde el botón "Exportar CSV" en cada sección de reportes.

---

## 12. Gestión de Usuarios y Roles

### Listado de Usuarios

Accesible desde Configuración (en desarrollo: sección "Planificado" con interfaz pendiente de implementación).

Actualmente el endpoint `GET /users` está implementado en backend y accesible via API.

### Roles Implementados

| Capacidad | Owner | Cashier |
|-----------|-------|---------|
| POS (crear ventas) | ✓ | ✓ |
| Ver productos | ✓ | ✓ |
| Ver ventas | ✓ | ✓ |
| Ver reportes | ✓ | ✓ |
| Ver dashboard | ✓ | ✓ |
| Crear/editar/eliminar productos | ✓ | ✗ |
| Ajustar stock manualmente | ✓ | ✗ |
| Subir/eliminar fotos de producto | ✓ | ✗ |
| Importar productos CSV | ✓ | ✗ |
| Anular ventas | ✓ | ✗ |
| Abrir/cerrar/reabrir jornada | ✓ | ✗ |
| Crear/anular movimientos de caja | ✓ | ✗ |
| Exportar CSV | ✓ | ✗ |
| Gestionar categorías | ✓ | ✗ |
| Gestionar usuarios | ✓ | ✗ |
| Acceder a configuración | ✓ | ✗ |
| Ver facturación/suscripción | ✓ | ✗ |

### Protecciones

- **Último owner**: no se puede cambiar el rol del último owner activo a cashier.
- **Último owner activo**: no se puede desactivar al último owner activo.
- **Aislamiento entre tiendas**: un usuario no puede ver ni modificar datos de otra tienda.

---

## 13. Configuración de Tienda

Ruta: `/dashboard/settings`

### Secciones

#### Tienda

Visualización y edición de:
- Nombre de la tienda
- Dirección
- Teléfono

#### Usuario Actual

- Email
- ID de usuario
- Rol (Owner / Cashier) con badge
- Enlace a facturación

#### Suscripción

- Estado actual (trial / active / past_due / canceled / expired)
- Estado de acceso (active / suspended / archived / purged)
- Enlace a gestión de suscripción

#### Permisos

Matriz visual de permisos comparando Owner vs Cashier con todas las capacidades listadas.

#### Categorías de Productos

Gestión en línea:
- Crear nueva categoría (nombre + prefijo SKU)
- Ver categorías existentes con su prefijo SKU
- Desactivar categorías (no se eliminan)

#### Usuarios (Planificado)

Sección informativa con indicación de que la gestión de usuarios (invitaciones, cambio de roles) está planificada para después del MVP.

#### Operación Diaria

Panel completo de gestión de jornada laboral:
- Estado actual (abierto/cerrado)
- Botón de apertura (con monto inicial)
- Botón de cierre (con conteo de efectivo)
- Botón de reapertura
- Formulario de movimientos de caja
- Línea de tiempo de eventos de la jornada

---

## 14. Suscripción y Facturación

Ruta: `/dashboard/settings/billing`

### Estados de Suscripción

| Estado | Descripción |
|--------|-------------|
| `trial` | Período de prueba gratuito |
| `active` | Suscripción activa y al día |
| `past_due` | Pago vencido, en período de gracia |
| `canceled` | Suscripción cancelada |
| `expired` | Suscripción expirada |

### Estados de Acceso

| Estado | Descripción |
|--------|-------------|
| `active` | Acceso normal |
| `suspended` | Acceso suspendido por falta de pago |
| `archived` | Tienda archivada |
| `purged` | Tienda eliminada permanentemente |

### Trial Gratuito

- 30 días de prueba desde el registro.
- Se muestra un banner en el dashboard durante el período de prueba.
- El backend verifica el estado del trial en cada solicitud autenticada.

### Información Visualizada

- Estado actual de suscripción
- Fecha de próximo cobro (si aplica)
- Días restantes de trial
- Enlace para gestionar suscripción

---

## 15. Sincronización Offline

El backend implementa endpoints de sincronización para permitir que dispositivos (o futuras apps móviles) operen sin conexión y sincronicen cuando recuperen conectividad.

### Push (cliente → servidor)

`POST /api/v1/sync/push`

Permite enviar al servidor los cambios realizados offline:

| Operación | Entidad | Descripción |
|-----------|---------|-------------|
| `product_upsert` | Producto | Crear o actualizar producto |
| `product_delete` | Producto | Eliminar producto |
| `sale_create` | Venta | Registrar una venta |
| `stock_adjustment` | Stock | Ajuste manual de stock |

**Idempotencia**: cada cambio incluye un `client_change_id` único. Si se reenvía el mismo cambio, el servidor lo detecta y lo omite.

**Validaciones**: el servidor verifica que el `store_id` del cambio coincida con el `store_id` del usuario autenticado.

### Pull (servidor → cliente)

`POST /api/v1/sync/pull`

Permite al cliente obtener todos los cambios desde una fecha/hora determinada:

| Entidad | Campos devueltos |
|---------|------------------|
| Productos | Todos los campos incluyendo `version` para detección de conflictos |
| Ventas | Ventas con sus ítems |
| Movimientos de stock | Todos los movimientos desde la última sincronización |

### Conflictos

El servidor implementa detección de conflictos multi-tienda (un cambio de una tienda A no puede aplicarse a la tienda B). El archivo `resolve_conflict.py` existe con la lógica preparada.

---

## 16. Importación Masiva de Productos (CSV)

### Cómo Funciona

1. El usuario abre el diálogo de importación desde la página de productos.
2. Selecciona o arrastra un archivo CSV.
3. El sistema valida el archivo y lo procesa en segundo plano (no bloquea la UI).
4. Se crea un "trabajo de importación" con seguimiento de progreso.

### Columnas Soportadas

| Columna | Requerido | Descripción |
|---------|-----------|-------------|
| `name` | ✓ | Nombre del producto |
| `price` | ✓ | Precio de venta (número) |
| `stock` | ✓ | Cantidad inicial |
| `category` | | Nombre de la categoría (se crea si no existe) |
| `cost_price` | | Precio de costo |
| `min_stock` | | Stock mínimo para alertas |
| `unit` | | Unidad de medida (valor por defecto: "unidad") |

### Seguimiento

- El diálogo muestra una barra de progreso con filas procesadas, importadas y con errores.
- Los errores se muestran por fila con la razón específica (ej: "precio inválido en fila 3").
- Al finalizar se presenta un resumen de importación vs errores.

### Validaciones

- Nombres duplicados dentro de la misma tienda
- Precios no negativos
- Categorías no inactivas
- Archivo vacío

---

## 17. Fotos de Producto

### Carga

- **Endpoint**: `POST /products/{product_id}/photo`
- **Almacenamiento**: Cloudinary (nube)
- **Validaciones**:
  - Tipo MIME: image/jpeg, image/png, image/webp
  - Firma mágica: verificación de los primeros bytes del archivo
  - Tamaño máximo: 5 MB
- **Procesamiento**: Cloudinary aplica auto-optimización (quality: good, width: 800, fetch_format: auto)

### Visualización

- La foto se muestra en la página de detalle del producto.
- Se actualiza la vista previa inmediatamente después de la subida.

### Eliminación

- La foto anterior se elimina de Cloudinary automáticamente al subir una nueva o al eliminar explícitamente.
- **Endpoint**: `DELETE /products/{product_id}/photo`

---

## 18. API de Salud (Health Checks)

### Liveness (`GET /health/live`)

Verifica que la aplicación esté corriendo. Retorna:
```json
{
  "status": "ok",
  "app_name": "inventory-backend",
  "version": "0.1.0"
}
```

### Readiness (`GET /health/ready`)

Verifica que la base de datos esté accesible. Retorna:
```json
{
  "status": "ok",
  "database": "connected"
}
```

Ambos endpoints son públicos (no requieren autenticación).

---

## 19. Métrica de la Aplicación

### Backend

- **Lenguaje**: Python 3.12+
- **Framework**: FastAPI 0.115+
- **Base de datos**: PostgreSQL (Async SQLAlchemy 2.0)
- **Autenticación**: Supabase Auth (producción) / PBKDF2 local (desarrollo)
- **Migraciones**: Alembic (22+ migraciones aplicadas)
- **Pruebas**: ~100+ tests con pytest-asyncio (unitarios e integración)
- **Cobertura**: CRUD completo, roles y permisos, aislamiento multi-tienda, sincronización, cierres de caja, exportaciones

### Frontend Web

- **Framework**: Next.js 15.1 (App Router)
- **Lenguaje**: TypeScript strict
- **Estilos**: Tailwind CSS 3.4
- **Pruebas unitarias**: Vitest + Testing Library (~46 archivos de test)
- **Pruebas E2E**: Playwright (8 spec files)
- **Sin dependencias externas**: UI construida a medida, sin librerías de componentes
- **Diseño responsivo**: Funcional en desktop, tablet y móvil vía navegador

---

## 20. Tecnologías

| Componente | Tecnología |
|------------|------------|
| Backend API | Python / FastAPI |
| Base de datos | PostgreSQL (Async SQLAlchemy) |
| Autenticación | Supabase Auth + JWT |
| Almacenamiento de imágenes | Cloudinary |
| Frontend Web | Next.js 15 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Testing Backend | pytest + pytest-asyncio |
| Testing Frontend | Vitest + Playwright |
| Migraciones | Alembic |
| Monitoreo | Sentry (opcional) |
| Control de versiones | Git + GitHub |

---

## Notas Finales

### Funcionalidades NO incluidas en esta versión

- Aplicación móvil nativa (en desarrollo inicial, solo esqueleto)
- Pasarela de pagos integrada (Pago mensual procesado externamente)
- Escaneo de cámara para códigos de barras en web (el POS permite búsqueda manual por QR)
- Notificaciones push
- Multi-idioma (interfaz actualmente en español)
- Integración con proveedores de tipo de cambio automático (las tasas se gestionan manualmente)

### Disponibilidad

- La aplicación web funciona en cualquier navegador moderno (Chrome, Firefox, Safari, Edge).
- No requiere instalación.
- Requiere conexión a internet para operar.
