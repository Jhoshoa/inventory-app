# First Approach — Inventario App v1.0

## Público objetivo: 10 comercios piloto (tiendas pequeñas/medianas en Bolivia)

---

## 1. Stack Tecnológico

### 1.1 Backend

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| **Base de datos** | Supabase (PostgreSQL) | Free → Pro | Relacional + JSONB + Auth incluido. Fácil escalar |
| **File storage** | Cloudinary | Free (25 créditos/mes) | Transformaciones y CDN. Subida comprimida desde el cliente |
| **API Server** | Next.js API Routes (o Express) | — | Backend unificado con el frontend web |
| **Queues** | BullMQ + Redis | Redis 7 | Colas para OCR, sync offline, notificaciones |
| **Auth** | Supabase Auth | — | JWT + RLS integrado con PostgreSQL |
| **Realtime** | Supabase Realtime (WebSockets) | — | Notificaciones de sync y alertas |
| **Cron keepalive** | GitHub Actions | — | $0, mantiene BD Free activa + datos de dólar |

### 1.2 Frontend

| Componente | Tecnología | Propósito |
|---|---|---|
| **App Móvil** | React Native + Expo | Principal canal de uso (venta, consulta rápida) |
| **Web App** | React + Next.js | Administración pesada (carga de fotos, reportes, configuración) |
| **BD Local (mobile)** | WatermelonDB (SQLite) | Offline-first: toda operación escribe local primero |
| **BD Local (web)** | Dexie.js (IndexedDB) | Offline parcial para PWA |
| **UI Kit** | Tailwind CSS + shadcn/ui (web) / NativeWind (mobile) | Consistencia visual entre web y mobile |

### 1.3 Servicios externos

| Servicio | Propósito | Plan |
|---|---|---|
| **Cloudinary** | Almacenar y servir fotos de productos | Free (25 créditos/mes ≈ 25 GB storage o 250K transforms) |
| **GitHub Actions** | Cron diario keepalive + fetch tipo de cambio | Free (2000 min/mes) |
| **Supabase** | BD, Auth, APIs | Free → $25/mes si hay tracción |
| **Redis** (Railway / Upstash) | BullMQ | Free tier (~50 MB) |

---

## 2. Features Esenciales (MVP para 10 clientes)

### 2.1 Gestión de productos

| Feature | Prioridad | Descripción |
|---|---|---|
| CRUD productos | 🔴 Crítico | Crear, editar, eliminar, listar productos |
| Foto desde cámara | 🔴 Crítico | Tomar foto → AI sugiere nombre/categoría → se guarda |
| QR por producto | 🔴 Crítico | Generar QR único al crear producto. Imprimible como etiqueta |
| Categorías | 🟡 Medio | Agrupar productos por categoría |
| Stock inicial | 🔴 Crítico | Campo de cantidad al crear producto |

### 2.2 Ventas (POS)

| Feature | Prioridad | Descripción |
|---|---|---|
| Escanear QR para vender | 🔴 Crítico | Escanear QR del producto → se agrega al carrito |
| Buscar producto por nombre | 🔴 Crítico | Si no hay QR, buscar escribiendo |
| Carrito con múltiples items | 🔴 Crítico | Agregar varios productos antes de cobrar |
| Confirmar venta | 🔴 Crítico | Al confirmar: descuenta stock, guarda registro |
| Método de pago | 🟡 Medio | Efectivo / QR / Transferencia |
| Ticket simple | 🟡 Medio | Resumen de la venta en pantalla |

### 2.3 Stock

| Feature | Prioridad | Descripción |
|---|---|---|
| Ver stock actual | 🔴 Crítico | Lista de productos con cantidad disponible |
| Alertas de stock bajo | 🟡 Medio | Productos por debajo del mínimo |
| Ajustar stock manual | 🟡 Medio | Corregir stock (merma, ajuste, devolución) |

### 2.4 Offline

| Feature | Prioridad | Descripción |
|---|---|---|
| Operaciones locales sin internet | 🔴 Crítico | Vender, crear producto, consultar stock funcionan offline |
| Cola de sincronización | 🔴 Crítico | Cambios se encolan y suben cuando hay conexión |
| Indicador de conexión | 🟡 Medio | Barra de estado: 🟢 online / 🟡 pendiente / 🔴 offline |
| Sync manual | 🟡 Medio | Botón para forzar sincronización |

### 2.5 Dashboard / Reportes

| Feature | Prioridad | Descripción |
|---|---|---|
| Ventas del día | 🟡 Medio | Total vendido hoy, cantidad de ventas |
| Productos con stock bajo | 🟡 Medio | Top 5 productos por agotarse |
| Últimas ventas | 🟡 Medio | Lista de las últimas 10 ventas |
| Tipo de cambio del día | 🟢 Bajo | Dólar oficial y paralelo (del keepalive) |

### 2.6 Configuración

| Feature | Prioridad | Descripción |
|---|---|---|
| Datos de la tienda | 🟡 Medio | Nombre, dirección, teléfono del negocio |
| Ver estado de sync | 🟡 Medio | Cuántos registros faltan sincronizar |

---

## 3. Pantallas (Mobile App)

### 3.1 Flow general

```
[Login] → [Dashboard] → [Productos]
                        → [Vender / POS]
                        → [Ventas]
                        → [Configuración]
```

### 3.2 Pantalla: Login

**Mock-up textual:**
```
┌─────────────────────────────────────┐
│                                     │
│           📦 Inventario             │
│                                     │
│   [📧 Correo electrónico]          │
│   [🔒 Contraseña]                  │
│                                     │
│   [ Iniciar sesión ]               │
│                                     │
│   ¿No tienes cuenta? Registrarse    │
│                                     │
│   O continuar con:                  │
│   [G] [F] [X]                       │
│                                     │
└─────────────────────────────────────┘
```

**Estados:**
- Carga: spinner mientras verifica credenciales
- Error: mensaje "Credenciales incorrectas" en rojo
- Offline: Si no hay internet y el usuario ya había iniciado sesión antes, usa token almacenado localmente

**Validaciones:**
- Email: formato válido
- Contraseña: mínimo 6 caracteres
- Ambos campos requeridos

**Comportamiento offline:**
- Si hay token válido en el dispositivo (almacenado en SecureStore/Keychain), permite entrar sin internet
- Si no hay token, muestra "Se necesita internet para iniciar sesión por primera vez"

---

### 3.3 Pantalla: Dashboard (Home)

**Mock-up textual:**
```
┌─────────────────────────────────────┐
│ 🟢 Sincronizado    📍 Mi Tienda    │ ← Barra de estado siempre visible
├─────────────────────────────────────┤
│                                     │
│  💰 Ventas hoy          📊 Bs 1,250 │
│  🛒 8 ventas             4 productos│
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ Stock bajo (3 productos) │    │
│  │ Arroz 1kg         → 2 und   │    │
│  │ Aceite           → 1 und   │    │
│  │ Leche            → 0 und   │    │
│  │ [Ver todos →]               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Últimas ventas               │    │
│  │ 10:30  María → Bs 45       │    │
│  │ 10:15  Juan  → Bs 120      │    │
│  │ 09:45  Efectivo → Bs 30    │    │
│  │ [Ver todas →]               │    │
│  └─────────────────────────────┘    │
│                                     │
│  💱 Dólar hoy: 6.96 / 9.40 (paral.)│
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │ ← Bottom navigation
│  Prod   Vender Ventas Config        │
└─────────────────────────────────────┘
```

**Bottom Navigation (siempre visible):**
| Ícono | Label | Ruta |
|---|---|---|
| 📦 | Productos | Lista de productos |
| 🛒 | Vender | Pantalla de venta (POS) |
| 📋 | Ventas | Historial de ventas |
| ⚙️ | Config | Ajustes y perfil |

**Estados de la barra de conexión:**
- 🟢 Sincronizado — última sync hace < 5 min
- 🟡 3 pendientes — hay datos sin subir
- 🔴 Sin conexión — modo offline
- ⚠️ Error al sincronizar — con botón [Reintentar]

**Indicador de carga inicial:**
- Skeleton loaders mientras se cargan métricas desde la BD local
- Si es primera vez y no hay datos locales, muestra "Cargando..."

**Empty state (primera vez):**
```
┌─────────────────────────────────────┐
│                                     │
│           🎉 ¡Bienvenido!           │
│                                     │
│   Tu tienda está vacía.             │
│   Agrega tu primer producto         │
│   para empezar a vender.            │
│                                     │
│   [➕ Agregar producto]             │
│                                     │
└─────────────────────────────────────┘
```

---

### 3.4 Pantalla: Productos (Lista)

**Mock-up textual:**
```
┌─────────────────────────────────────┐
│ ← Atrás         📦 Productos   [+] │
├─────────────────────────────────────┤
│ [🔍 Buscar producto...            ] │ ← Search bar con debounce
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📸 Arroz Favorito 1kg      │    │
│  │    Cód: #A-001   🟢 50 und │    │
│  │    Bs 12.50                 │    │
│  ├─────────────────────────────┤    │
│  │ 📸 Aceite Rico 1L          │    │
│  │    Cód: #A-002   🟡 3 und  │    │ ← Stock bajo (amarillo)
│  │    Bs 18.00                 │    │
│  ├─────────────────────────────┤    │
│  │ 📸 Fideo Don Vittorio      │    │
│  │    Cód: #A-003   🔴 0 und  │    │ ← Sin stock (rojo)
│  │    Bs 8.50                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Mostrando 48 productos             │
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │
└─────────────────────────────────────┘
```

**Estados:**
- **Carga:** Skeleton list (8 filas grises)
- **Vacío:** "No hay productos. Agrega tu primer producto" + botón [+]
- **Búsqueda sin resultados:** "No se encontraron productos para 'xyz'"
- **Error:** "No se pudieron cargar los productos" + botón [Reintentar]
- **Offline:** Los productos se cargan desde WatermelonDB. Sin cambio visual, funciona igual

**Acciones por producto (tap → menú contextual o navegación):**
1. Tap → [Detalle del producto]
2. Tap largo → Editar / Eliminar / Vender
3. Swipe left → Opción rápida "Vender"
4. Swipe right → Opción rápida "Editar stock"

**Filtros (botón en la barra de búsqueda):**
- Categoría: Todos / Abarrotes / Lácteos / Bebidas / etc.
- Stock: Todos / Con stock / Sin stock / Stock bajo
- Ordenar: Nombre A-Z / Stock menor a mayor / Precio mayor a menor

---

### 3.5 Pantalla: Agregar / Editar Producto

**Mock-up textual:**
```
┌─────────────────────────────────────┐
│ ← Atrás     Nuevo Producto    [💾] │ ← Guardar
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     [📸 Tomar foto]        │    │ ← Cámara / Galería
│  │                             │    │
│  │   La AI sugerirá nombre     │    │
│  │   y categoría automático    │    │
│  └─────────────────────────────┘    │
│                                     │
│  Nombre *                          │
│  [Arroz Favorito 1kg             ] │
│                                     │
│  Categoría                          │
│  [Abarrotes                    ▼  ] │ ← Dropdown
│                                     │
│  Precio de venta *                  │
│  [12.50                            ] │
│                                     │
│  Precio de compra (opcional)        │
│  [10.00                            ] │
│                                     │
│  Stock inicial *                    │
│  [50                               ] │
│                                     │
│  Stock mínimo (alerta)              │
│  [5                                ] │
│                                     │
│  Unidad                             │
│  [Unidad                       ▼  ] │ ← dropdown: unidad/kg/litro/docena
│                                     │
│  Código / SKU (opcional)            │
│  [A-001                            ] │ ← Autogenerado si se deja vacío
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │
└─────────────────────────────────────┘
```

**Campos obligatorios:** Nombre, Precio, Stock inicial
**Campos sugeridos por AI:** Nombre, Categoría (después de tomar foto)

**Estado de carga después de foto:**
- Mientras la AI procesa: "Analizando imagen..."
- Si no se pudo detectar: campos vacíos, el usuario llena manual

**Validaciones:**
- Nombre: requerido, máx 100 caracteres
- Precio: requerido, > 0
- Stock: requerido, ≥ 0
- Si se toma foto y la AI devuelve datos, se prellenan los campos

**Comportamiento offline:**
- El producto se guarda en WatermelonDB con `synced = false`
- Aparece inmediatamente en la lista de productos
- Aparece con indicador 🟡 en el detalle (pendiente de subir)

---

### 3.6 Pantalla: Detalle del Producto

```
┌─────────────────────────────────────┐
│ ← Atrás         [Editar]  [⋯]     │ ← ⋯ = menú (Eliminar, QR)
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │         📸                  │    │ ← Foto del producto
│  │    Arroz Favorito 1kg       │    │
│  │    Cód: #A-001              │    │
│  └─────────────────────────────┘    │
│                                     │
│  💰 Bs 12.50                        │
│  📦 Stock: 50 unidades    🟢       │
│  📂 Categoría: Abarrotes           │
│  🏷️ SKU: A-001                    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🏷️ [Ver QR del producto]   │    ← Muestra QR en pantalla completa
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📊 Últimas ventas           │    │
│  │  10:30  Bs 12.50 × 2 = 25  │    │
│  │  09:15  Bs 12.50 × 1 = 12.5│    │
│  │  [Ver historial completo →] │    │
│  └─────────────────────────────┘    │
│                                     │
│  [🛒 Vender]  [📦 Ajustar stock]   │
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │
└─────────────────────────────────────┘
```

**Acciones rápidas desde detalle:**
1. Vender — abre modal de cantidad "¿Cuántos vas a vender?" → confirma → descuenta stock
2. Ajustar stock — modal "Stock actual: 50. Nuevo valor: [___]"
3. Ver QR — muestra QR en pantalla completa (listo para imprimir/imagen)
4. Editar — abre formulario de edición con datos prellenados
5. Eliminar — confirmación "¿Estás seguro? Esta acción no se puede deshacer"
6. Compartir QR — opción nativa de compartir

---

### 3.7 Pantalla: Vender (POS)

**Mock-up textual:**
```
┌─────────────────────────────────────┐
│ ← Atrás           🛒 Vender        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [🔍 Buscar o escanear QR]  │    │ ← Search + botón de cámara
│  └─────────────────────────────┘    │
│                                     │
│  📱 Botón grande: [📷 Escanear QR] │ ← Scanner a pantalla completa
│                                     │
│  ─── Carrito ─────────────────────  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Arroz 1kg    × 2  Bs 25.00 │    │
│  │                    [−] [✕] │    │ ← [−] quitar 1, [✕] eliminar
│  ├─────────────────────────────┤    │
│  │ Aceite       × 1  Bs 18.00 │    │
│  │                    [−] [✕] │    │
│  ├─────────────────────────────┤    │
│  │ Leche        × 3  Bs 27.00 │    │
│  │                    [−] [✕] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│  Total:                  Bs 70.00   │
│  Items: 6                           │
│                                     │
│  Método de pago:                    │
│  [💰 Efectivo] [📱 QR] [💳 Tarj.] │ ← Pills seleccionables
│                                     │
│  [✅ Cobrar Bs 70.00]              │ ← Botón principal
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │
└─────────────────────────────────────┘
```

**Flujo completo de venta:**

```
1. Usuario escanea QR del producto
   └→ Producto encontrado → se agrega al carrito (cantidad 1)
   └→ Producto NO encontrado → mensaje "Producto no reconocido"

2. Si no hay QR: escribe nombre en buscador
   └→ Resultados filtrados en tiempo real
   └→ Tap en resultado → se agrega al carrito

3. En el carrito:
   └→ Tap en [−]: reduce cantidad (si llega a 0, elimina)
   └→ Tap en [✕]: elimina item del carrito

4. Selecciona método de pago (default: Efectivo)

5. Tap en [✅ Cobrar]
   └→ Si hay stock suficiente: descuenta, guarda venta, muestra confirmación
   └→ Si NO hay stock: alerta "Stock insuficiente para: Arroz (solo queda 1)"

6. Pantalla de confirmación:
┌────────────────────────────────────┐
│         ✅ Venta registrada        │
│                                    │
│   Total: Bs 70.00                  │
│   Método: Efectivo                 │
│   Vuelto: Bs 30.00 (si aplica)    │
│                                    │
│   [🛒 Nueva venta] [📋 Ver ventas] │
└────────────────────────────────────┘
```

**Estados:**
- **Carrito vacío:** "Escanea un QR o busca un producto para empezar"
- **Cargando producto:** spinner momentáneo al escanear
- **Stock insuficiente:** alerta roja con detalle del producto faltante
- **Offline:** Carrito y venta funcionan 100%. Al cobrar → descuenta stock local + encola

**Comportamiento offline:**
- La venta se guarda en WatermelonDB
- Stock se descuenta localmente
- Si el QR no está en caché local, muestra "Producto no encontrado en modo offline"
- Al reconectar: se sincroniza automáticamente

---

### 3.8 Pantalla: Ventas (Historial)

```
┌─────────────────────────────────────┐
│ ← Atrás         📋 Ventas          │
├─────────────────────────────────────┤
│                                     │
│  💰 Total del día: Bs 1,250         │
│  🛒  8 ventas | 23 productos        │
│                                     │
│  ─── Hoy ─────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 10:30  María               │    │
│  │ 2 items   Efectivo Bs 45   │    │
│  ├─────────────────────────────┤    │
│  │ 10:15  Juan                │    │
│  │ 5 items   QR       Bs 120  │    │
│  ├─────────────────────────────┤    │
│  │ 09:45  —                   │    │
│  │ 1 item    Efectivo Bs 30   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─── Ayer ────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 18:20  Cliente              │    │
│  │ 3 items   Transfer. Bs 85   │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │
└─────────────────────────────────────┘
```

**Estados:**
- **Carga:** skeleton histórico
- **Vacío:** "No hay ventas registradas hoy"
- **Error:** "No se pudieron cargar las ventas" + [Reintentar]
- **Offline:** Se muestran ventas desde BD local. Las no sincronizadas tienen icono 🟡

**Acción: tap en venta → detalle:**
```
┌─────────────────────────────────────┐
│ ← Atrás       Detalle de Venta      │
├─────────────────────────────────────┤
│  Fecha: 11/05/2026 10:30            │
│  Cliente: María                     │
│  Método: Efectivo                   │
│                                     │
│  ─── Productos ───────────────────  │
│  Arroz 1kg       × 2   = Bs 25.00  │
│  Aceite          × 1   = Bs 18.00  │
│  Leche           × 3   = Bs 27.00  │
│  ─────────────────────────────────  │
│  Total:                  Bs 70.00   │
│  Pagó:                  Bs 100.00   │
│  Vuelto:                Bs 30.00    │
│                                     │
│  [🔄 Devolver venta]                │ ← Opción de devolución
└─────────────────────────────────────┘
```

---

### 3.9 Pantalla: Configuración

```
┌─────────────────────────────────────┐
│ ← Atrás         ⚙️ Configuración   │
├─────────────────────────────────────┤
│                                     │
│  ─── Tienda ──────────────────────  │
│  Nombre: [Mi Tienda              ]  │
│  Dirección: [Av. Siempre Viva 123] │
│  Teléfono: [78945612             ]  │
│                                     │
│  ─── Sincronización ──────────────  │
│  🟢 Última sync: 10:45:32          │
│  📤 Pendientes de subir: 0         │
│  📥 Pendientes de bajar: 0         │
│  [🔄 Sincronizar ahora]            │
│                                     │
│  ─── Preferencias ────────────────  │
│  Stock mínimo por defecto: [5]     │
│  Moneda: [Bolivianos (Bs) ▼]       │
│  Idioma: [Español ▼]               │
│                                     │
│  ─── Datos ───────────────────────  │
│  [📤 Exportar productos (CSV)]     │
│  [📤 Exportar ventas (CSV)]        │
│  [💾 Total productos: 48]          │
│  [💾 Total ventas: 156]            │
│                                     │
│  ─── Información ─────────────────  │
│  Versión: 1.0.0                     │
│  📚 Ayuda / Tutorial                │
│  💬 Contacto / Soporte              │
│  [🚪 Cerrar sesión]                │
│                                     │
├─────────────────────────────────────┤
│ [📦] [🛒] [📋] [⚙️]               │
└─────────────────────────────────────┘
```

---

### 3.10 Pantalla: Escáner QR (cámara a pantalla completa)

```
┌─────────────────────────────────────┐
│ ← Cancelar                          │
│                                     │
│                                     │
│     ┌─────────────────────────┐    │
│     │                         │    │
│     │    📷                   │    │ ← Cámara en vivo
│     │    Cuadro de escaneo    │    │
│     │    [▓▓▓▓▓▓▓▓▓▓▓▓▓]    │    │
│     │    ───────────────     │    │
│     │                         │    │
│     └─────────────────────────┘    │
│                                     │
│     Apunta el QR del producto       │
│     para agregarlo al carrito       │
│                                     │
│     [🔦 Linterna]                   │ ← Botón de linterna
│                                     │
└─────────────────────────────────────┘
```

**Estados:**
- **Buscando:** "Apunta el código QR del producto"
- **Encontrado:** beep de vibración + "Producto agregado: Arroz 1kg" (brief) → vuelve al POS
- **No encontrado:** "QR no reconocido. Verifica que sea un producto registrado"
- **Error de cámara:** "No se pudo abrir la cámara. Verifica los permisos" + [Buscar manualmente]
- **Permiso denegado:** "Permiso de cámara requerido" + [Abrir configuración]

---

## 4. Pantallas (Web App)

La web app es **complementaria** — pensada para administración pesada.

### 4.1 Navegación

```
┌──────────────────────────────────────────────────────────────┐
│  📦 Inventario          [Dashboard] [Productos] [Ventas] [⚙️]│
│  Mi Tienda                           [👤 Admin]  Logout     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  (Contenido de la pantalla activa)                           │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Dashboard web

```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Ventas   │  │ Productos│  │ Stock    │  │ Tipo de  │    │
│  │ hoy      │  │ totales  │  │ bajo     │  │ cambio   │    │
│  │ Bs 1,250 │  │ 48       │  │ 3        │  │ 6.96/9.40│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌─────────────────────────────┐  ┌──────────────────────┐   │
│  │ Ventas últimos 7 días      │  │ Productos más        │   │
│  │ (gráfico de barras)        │  │ vendidos (top 10)    │   │
│  │                             │  │ (tabla)             │   │
│  │ ██   ████  ██  █████  ███  │  │ 1. Arroz        45  │   │
│  │ L  M  M  J  V  S  D       │  │ 2. Aceite       32  │   │
│  └─────────────────────────────┘  └──────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Productos (web — tabla completa)

```
┌──────────────────────────────────────────────────────────────┐
│ Productos                              [+ Nuevo producto]    │
├──────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...         ] [Categoría: Todos ▼] [Stock: Todos ▼]│
├──────────────────────────────────────────────────────────────┤
│ ☐ │ Foto │ Código │ Nombre        │ Precio │ Stock │ Categ │
│──────────────────────────────────────────────────────────────│
│ ☐ │ 📸  │ A-001  │ Arroz 1kg     │ 12.50  │ 50    │ Abarr │
│ ☐ │ 📸  │ A-002  │ Aceite        │ 18.00  │ 3🟡   │ Abarr │
│ ☐ │ 📸  │ A-003  │ Fideo         │ 8.50   │ 0🔴   │ Abarr │
│ ☐ │ 📸  │ B-001  │ Leche Entera  │ 9.00   │ 15    │ Lact  │
├──────────────────────────────────────────────────────────────┤
│ [🗑️ Eliminar seleccionados]  Mostrando 48 de 48           │
│ < 1 2 3 ... 10 >                                            │
└──────────────────────────────────────────────────────────────┘
```

**Acciones:** Selección múltiple + acciones batch, exportar CSV, importar CSV, edición inline (click en celda)

---

## 5. Arquitectura de Datos

### 5.1 Flujo de escritura (ej: crear producto)

```
Mobile App                         Backend                          Supabase        Cloudinary
    │                                 │                                │                │
    │  1. Guarda en WatermelonDB      │                                │                │
    │  (synced = false)               │                                │                │
    │◄──── OK, ID local generado      │                                │                │
    │                                 │                                │                │
    │  2. Encola en sync_queue        │                                │                │
    │                                 │                                │                │
    │  ─── Si hay internet ─────────> │  3. POST /api/sync/push       │                │
    │                                 │  4. INSERT producto            │                │
    │                                 │───────────────────────────────>│                │
    │                                 │  5. Sube foto (si hay)         │                │
    │                                 │────────────────────────────────────────────────>│
    │                                 │  6. OK + URL de imagen        │                │
    │  <──── OK, synced = true ────── │◄──── OK                       │                │
    │                                 │                                │                │
    │  ─── Sin internet ───────────── │                                │                │
    │  (queda en cola local)          │                                │                │
    │  Cuando haya conexión:          │                                │                │
    │  ──────────────────────────────>│  (mismo flujo de arriba)       │                │
```

### 5.2 Tablas esenciales (PostgreSQL)

```sql
-- Productos
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID REFERENCES stores(id),
  name        TEXT NOT NULL,
  category    TEXT,
  sku         TEXT,
  price       DECIMAL(10,2) NOT NULL,
  cost_price  DECIMAL(10,2),
  stock       INTEGER DEFAULT 0,
  min_stock   INTEGER DEFAULT 5,
  unit        TEXT DEFAULT 'unidad',
  photo_url   TEXT,
  qr_code     TEXT UNIQUE,
  is_active   BOOLEAN DEFAULT TRUE,
  metadata    JSONB DEFAULT '{}',
  version     INTEGER DEFAULT 1,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ventas
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id),
  device_id       TEXT,
  customer_name   TEXT,
  payment_method  TEXT,
  subtotal        DECIMAL(10,2),
  discount        DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  items_count     INTEGER DEFAULT 0,
  synced          BOOLEAN DEFAULT FALSE,
  version         INTEGER DEFAULT 1,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle de ventas
CREATE TABLE sale_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  product_name  TEXT NOT NULL,
  quantity      INTEGER NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  subtotal      DECIMAL(10,2) NOT NULL
);

-- Tipo de cambio (del keepalive job)
CREATE TABLE exchange_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  source      TEXT NOT NULL,
  buy_price   DECIMAL(10,2),
  sell_price  DECIMAL(10,2),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, source)
);
```

---

## 6. Estrategia Offline (resumen ejecutivo)

| Operación | Funciona offline? | Cómo |
|---|---|---|
| Iniciar sesión | ⚠️ Solo si ya inició sesión antes | Token almacenado en SecureStore |
| Ver productos | ✅ Sí | WatermelonDB local |
| Crear producto | ✅ Sí | Se guarda local con `synced = false` |
| Vender | ✅ Sí | Descuenta stock local + encola venta |
| Escanear QR | ✅ Sí | QR se lee sin internet, producto se busca local |
| Ver historial ventas | ✅ Sí | Ventas locales + locales sin sync |
| Ver dashboard | ✅ Sí | Métricas calculadas sobre datos locales |
| Tomar/ver foto | ⚠️ Si ya fue descargada | Foto local en sistema de archivos |
| Sync automático | N/A | Se activa al detectar conexión |
| Subir foto | ❌ Requiere internet | Se encola para cuando haya WiFi |

---

## 7. Infraestructura y Deployment

| Componente | Proveedor | Plan | Detalle |
|---|---|---|---|
| **BD + Auth + API** | Supabase | Free ($0) → Pro ($25/mes) | Proyecto único |
| **Colas (BullMQ)** | Railway / Upstash Redis | Free (~50 MB) | Redis para colas |
| **Fotos** | Cloudinary | Free (25 créditos/mes) | 25 GB storage ~ 25,000 fotos |
| **API Server** | Vercel (Next.js) | Free (100 GB ancho de banda) | API + Web app |
| **Cron keepalive** | GitHub Actions | Free (2000 min/mes) | 1 job/día |
| **Mobile App** | Expo + App Store / Google Play gratis | APK directo para pilotos | Build y sharing via Expo |
| **Monitoreo** | Sentry | Free (5K eventos/mes) | Errores en producción |

### Costo mensual estimado (piloto 10 clientes):

| Servicio | Costo |
|---|---|
| Supabase | $0 (Free) |
| Redis (Railway) | $0 (Free tier) |
| Cloudinary | $0 (Free tier) |
| Vercel | $0 (Free tier) |
| GitHub Actions | $0 (Free) |
| Sentry | $0 (Free tier) |
| **Total** | **$0/mes** |

Si migra a Pro cuando haya tracción: **~$30-40/mes** (Supabase $25 + Redis $5-10 + Cloudinary si excede Free).

---

## 8. Plan de implementación (Semanas 1-6)

### Semana 1: Fundación

| Día | Tarea |
|---|---|
| 1-2 | Setup Supabase: BD, Auth, tablas, RLS |
| 3-4 | Setup backend: Next.js API routes, webhooks, Cloudinary config |
| 5 | Setup Redis + BullMQ (colas photo-processing y sync) |
| 6 | Setup projecto React Native + Expo + WatermelonDB |

### Semana 2: Productos y Fotos

| Día | Tarea |
|---|---|
| 1-2 | CRUD de productos (mobile + web) |
| 3-4 | Integración de cámara + subida a Cloudinary |
| 5-6 | Generación de QR por producto |

### Semana 3: Ventas (POS)

| Día | Tarea |
|---|---|
| 1-2 | Escáner QR + búsqueda de productos |
| 3-4 | Carrito de ventas + confirmación + descuento de stock |
| 5-6 | Historial de ventas + detalle |

### Semana 4: Offline-first

| Día | Tarea |
|---|---|
| 1-2 | WatermelonDB sync protocol (push/pull) |
| 3-4 | Cola de sincronización + detección de conectividad (NetInfo) |
| 5-6 | Indicadores de estado offline/online en UI |

### Semana 5: Dashboard y Web

| Día | Tarea |
|---|---|
| 1-2 | Dashboard web (Next.js) con métricas |
| 3-4 | Dashboard mobile con métricas resumidas |
| 5 | Configuración (tienda, preferencias) |
| 6 | Exportar CSV de productos y ventas |

### Semana 6: Pulido y Release

| Día | Tarea |
|---|---|
| 1 | Login/registro + onboarding básico |
| 2 | Manejo de errores global + Sentry |
| 3 | Build APK + deploy web a Vercel |
| 4 | Onboarding con 10 clientes piloto |
| 5 | Corrección de bugs críticos |
| 6 | Release v1.0 |

---

## 9. Criterios de éxito para el piloto (10 clientes)

| Métrica | Objetivo |
|---|---|
| Ventas registradas en la app | > 50 ventas/día entre todos los clientes |
| Productos registrados | > 200 productos totales |
| Tasa de sync exitosa | > 99% (sin pérdida de datos) |
| Tiempo promedio de una venta | < 15 segundos (desde escanear QR hasta cobrar) |
| Crash-free rate | > 99.5% (Sentry) |
| NPS de clientes piloto | > 7/10 |
| Clientes que siguen usando la app después de la semana 1 | > 8/10 |

---

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Clientes no usan la app (vuelven al cuaderno) | Alta | Alto | Onboarding presencial, mostrar beneficio real (ahorro de tiempo) |
| Internet muy inestable, sync falla | Alta | Medio | Offline-first robusto, cola de sync con backoff, indicadores claros |
| Clientes sin smartphone compatible | Media | Alto | App web PWA como alternativa ligera para cualquier navegador |
| QR se borra/daña en el producto | Media | Bajo | Búsqueda por nombre como respaldo, reimprimir QR desde la app |
| Pérdida de datos por sync conflict | Baja | Alto | Delta sync para stock, versionado, pruebas exhaustivas |
| Cliente no entiende la interfaz | Alta | Medio | UI en español, tutorial interactivo de 3 pasos al iniciar |
| Cloudinary free tier se acaba (25 créditos) | Media | Medio | Comprimir fuerte las fotos (~200KB c/u = 125,000 fotos en free) |
