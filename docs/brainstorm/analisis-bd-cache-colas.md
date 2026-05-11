# Análisis: Base de Datos, Caché y Colas

---

## 1. Supabase vs MongoDB: ¿Cuál elegir?

### Comparación directa para nuestra app

| Criterio | Supabase (PostgreSQL) | MongoDB |
|---|---|---|
| **Tipo** | Relacional (SQL) + JSONB | Documentos (NoSQL) |
| **Esquema** | Fijo con migraciones | Flexible / Schema-less |
| **Soporte de transacciones** | ✅ ACID completo | ⚠️ Solo a nivel de documento |
| **Joins / relaciones** | ✅ SQL nativo | ❌ No tiene, toca denormalizar |
| **Offline-first / Sync** | ✅ Integrable con WatermelonDB | ⚠️ Más complejo de sincronizar |
| **JSON / datos semiestructurados** | ✅ JSONB (lo mejor de ambos mundos) | ✅ Nativo |
| **Autenticación incluida** | ✅ Sí (Auth nativo) | ❌ Toca servicio externo |
| **Storage de fotos incluido** | ✅ Sí (S3-compatible) | ❌ Toca GridFS o S3 aparte |
| **APIs auto-generadas** | ✅ REST + GraphQL automáticos | ❌ Toca construirlas |
| **Realtime / WebSockets** | ✅ Integrado (cambios en BD → clientes) | ⚠️ Change Streams (configurable) |
| **Costo inicial** | ~$25/mes (Pro) | ~$57/mes (Atlas M10) |
| **Costo total estimado** | ~$30-40/mes (con auth + storage) | ~$90-140/mes (con auth + storage aparte) |
| **Open source** | ✅ Sí | ❌ Licencia SSPL (restrictiva) |
| **Escalabilidad horizontal** | Vertical + read replicas | Sharding nativo |
| **Self-hosted** | ✅ Sí | ⚠️ Posible pero complejo |
| **pgvector (AI/ML)** | ✅ Nativo | ✅ Atlas Vector Search |
| **Vendor lock-in** | Bajo (PostgreSQL puro, fácil de migrar) | Medio (MQL propio) |

### Veredicto: **Supabase (PostgreSQL) gana para nuestro caso**

**Razones:**

1. **Nuestra data es relacional por naturaleza:**
   - `tiendas` → `productos` → `ventas` → `items_venta` → `proveedores`
   - SQL es el modelo natural para inventario (relaciones, integridad referencial, joins)

2. **JSONB nos da lo mejor de MongoDB dentro de PostgreSQL:**
   - Podemos tener campos flexibles (ej. `metadata JSONB` para atributos variables de productos)
   - Sin perder la capacidad de hacer joins, transacciones ACID, y consultas SQL

3. **Todo incluido (auth, storage, realtime, APIs):**
   - No necesitamos Auth0, S3, ni construir APIs REST manualmente
   - Reduce costos y complejidad operativa

4. **Offline-first con WatermelonDB:**
   - WatermelonDB tiene sync protocol nativo con PostgreSQL/Supabase
   - Con MongoDB tocaría construir todo el sync engine desde cero

5. **Costo:**
   - Supabase Pro ($25/mes) incluye auth, storage, APIs, realtime
   - MongoDB Atlas ($57/mes) solo da la BD, auth/storage/APIs cuestan extra (~$90-140/mes total)

---

## 2. Esquema de Base de Datos (Supabase / PostgreSQL)

### Tablas principales

```sql
-- =====================================================
-- CATÁLOGO DE TIENDAS
-- =====================================================
CREATE TABLE stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  owner_name    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CATÁLOGO DE PRODUCTOS
-- =====================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,             -- "Arroz Favorito 1kg"
  description     TEXT,
  category        TEXT,                      -- "Abarrotes", "Lácteos", etc.
  sku             TEXT,                      -- Código único opcional
  barcode         TEXT,                      -- Código de barras original (si tiene)
  qr_code         TEXT UNIQUE,               -- Nuestro QR generado
  unit            TEXT DEFAULT 'unidad',      -- "unidad", "kg", "litro", "docena"
  price           DECIMAL(10,2) NOT NULL,     -- Precio de venta
  cost_price      DECIMAL(10,2),              -- Precio de compra (para márgenes)
  stock           INTEGER DEFAULT 0,          -- Stock disponible en tiempo real
  min_stock       INTEGER DEFAULT 5,          -- Umbral mínimo para alertas
  max_stock       INTEGER DEFAULT 100,        -- Stock máximo deseado
  is_active       BOOLEAN DEFAULT TRUE,
  -- Campos flexibles (atributos variables por producto)
  metadata        JSONB DEFAULT '{}',         -- { "marca": "Favorito", "origen": "Santa Cruz", "tamaño": "1kg" }
  -- Sync metadata (offline-first)
  version         INTEGER DEFAULT 1,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_qr ON products(qr_code);
CREATE INDEX idx_products_sku ON products(sku);

-- =====================================================
-- STOCK POR SUCURSAL (multi-location)
-- =====================================================
CREATE TABLE stock_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,              -- "Bodega Norte", "Estante A3"
  address       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_stock (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id     UUID REFERENCES stock_locations(id) ON DELETE CASCADE,
  quantity        INTEGER DEFAULT 0,
  -- Sync metadata
  version         INTEGER DEFAULT 1,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- =====================================================
-- VENTAS
-- =====================================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  device_id       TEXT,                      -- Dispositivo que registró la venta
  customer_name   TEXT,
  customer_phone  TEXT,
  payment_method  TEXT,                      -- "efectivo", "qr", "transferencia", "tarjeta"
  subtotal        DECIMAL(10,2),
  discount        DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  notes           TEXT,
  -- Sync metadata
  synced          BOOLEAN DEFAULT FALSE,
  version         INTEGER DEFAULT 1,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_created ON sales(created_at DESC);
CREATE INDEX idx_sales_synced ON sales(synced);

-- =====================================================
-- DETALLE DE VENTAS (items vendidos)
-- =====================================================
CREATE TABLE sale_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  product_name  TEXT NOT NULL,             -- Snapshot del nombre al momento de la venta
  quantity      INTEGER NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,    -- Precio unitario al momento de la venta
  subtotal      DECIMAL(10,2) NOT NULL,
  -- Sync metadata
  version       INTEGER DEFAULT 1
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- =====================================================
-- PROVEEDORES
-- =====================================================
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÓRDENES DE COMPRA (PO)
-- =====================================================
CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id),
  status          TEXT DEFAULT 'pending',    -- "pending", "ordered", "received", "cancelled"
  total           DECIMAL(10,2),
  notes           TEXT,
  expected_date   DATE,
  received_date   DATE,
  -- Sync metadata
  synced          BOOLEAN DEFAULT FALSE,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  product_name    TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost       DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL
);

-- =====================================================
-- FOTOS DE PRODUCTOS
-- =====================================================
CREATE TABLE product_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  url           TEXT,                       -- URL remota (después de sync)
  local_path    TEXT,                       -- Ruta local (antes de sync)
  is_synced     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COLA DE SINCRONIZACIÓN (sync queue local del servidor)
-- =====================================================
CREATE TABLE sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT NOT NULL,
  table_name      TEXT NOT NULL,            -- "products", "sales", etc.
  operation       TEXT NOT NULL,            -- "CREATE", "UPDATE", "DELETE"
  record_id       UUID NOT NULL,
  payload         JSONB NOT NULL,           -- Datos completos del cambio
  status          TEXT DEFAULT 'pending',   -- "pending", "processing", "completed", "failed"
  retry_count     INTEGER DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_device ON sync_queue(device_id);
```

### ¿Dónde usar JSONB vs columnas fijas?

| Campo | Tipo | Razón |
|---|---|---|
| `name`, `price`, `stock` | Columna fija | Se consultan siempre, se usan en joins, se indexan |
| `metadata` | JSONB | Atributos variables según el rubro de la tienda |
| Atributos de producto en `metadata` | JSONB: `{ "marca", "color", "tamaño", "sabor" }` | Cada tienda tiene atributos distintos |

**¿Por qué no usar solo MongoDB entonces?** Porque aunque la metadata es flexible, el **core** del sistema (productos, ventas, stock) es puramente relacional. Con PostgreSQL + JSONB tenemos **ambos mundos** sin sacrificar integridad referencial.

---

## 3. JSONB en acción: Cómo guardamos el resultado del OCR/Foto

Cuando el usuario fotografía su cuaderno, el resultado del OCR se mapea a JSON y se inserta:

```json
{
  "nombre": "Arroz Favorito 1kg",
  "cantidad": 50,
  "precio": 12.50,
  "categoria": "Abarrotes",
  "unidad": "unidad",
  "metadata": {
    "marca": "Favorito",
    "origen": "Santa Cruz",
    "tamaño": "1kg",
    "tipo": "granos"
  }
}
```

**Inserción desde el OCR (foto → producto):**

```sql
INSERT INTO products (store_id, name, category, unit, price, stock, metadata)
VALUES (
  'tienda_uuid',
  'Arroz Favorito 1kg',
  'Abarrotes',
  'unidad',
  12.50,
  50,
  '{"marca": "Favorito", "origen": "Santa Cruz", "tamaño": "1kg", "tipo": "granos"}'
);
```

**Si después se necesitan más atributos, solo se agregan al JSONB:**

```sql
UPDATE products
SET metadata = metadata || '{"vencimiento": "2026-12-31", "lote": "L-123"}'
WHERE id = 'prod_uuid';
```

Sin migraciones, sin esquemas nuevos. Eso es lo "flexible" de MongoDB, pero dentro de PostgreSQL.

---

## 4. Redis: ¿Lo necesitamos desde el principio?

### ¿Para qué sirve Redis en nuestra app?

| Uso | ¿Crítico desde el día 1? | ¿Después? |
|---|---|---|
| **BullMQ (Cola de trabajos)** | ✅ Sí | Sí |
| **Caché de consultas frecuentes** | ❌ No | ✅ Sí |
| **Rate limiting** | ❌ No | ✅ Sí |
| **Sesiones / tokens** | ⚠️ Opcional | ✅ Sí |
| **Contadores en tiempo real** | ❌ No | ✅ Sí |

### Veredicto: **Redis SÍ desde el principio, pero SOLO para BullMQ**

**Caché NO es necesario al inicio.** PostgreSQL con índices bien puestos responde consultas en milisegundos para volúmenes pequeños (< 10,000 productos). Añadir Redis como caché sería premature optimization.

**BullMQ SÍ es necesario desde el día 1** porque los workers de:
- Procesamiento de fotos (OCR → JSON)
- Sincronización offline (push/pull de dispositivos)
- Notificaciones y alertas (stock bajo)
- Generación de reportes

Deben correr en segundo plano sin bloquear la API.

---

## 5. Servicio de Colas: BullMQ

### ¿Qué es BullMQ?

BullMQ es un sistema de colas basado en Redis para Node.js. Es la opción más madura del ecosistema JavaScript/TypeScript.

### ¿Por qué BullMQ y no otra opción?

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **BullMQ** | Maduro, Redis-based, retry+backoff nativo, DLQ, +5k ⭐ | Depende de Redis | ✅ RECOMENDADO |
| **RabbitMQ** | Muy robusto, AMQP standard | Overkill para nuestro tamaño, más complejo | ❌ |
| **Apache Kafka** | Streaming de eventos, altísimo throughput | Mucha infraestructura, overkill | ❌ |
| **SQS (AWS)** | Serverless, 0 mantenimiento | Vendor lock-in AWS | ⚠️ Alternativa si ya usan AWS |
| **In-process (setTimeout)** | Simple | No persiste, no escala, se pierde todo al reiniciar | ❌ |

### Colas que necesitamos:

```
┌────────────────────────────────────────────────────────────────────┐
│                          BULLMQ + REDIS                           │
│                                                                    │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  photo-queue    │  │ sync-queue   │  │ notification-queue │    │
│  │  (OCR/AI)       │  │ (offline)    │  │ (alertas)          │    │
│  ├────────────────┤  ├──────────────┤  ├────────────────────┤    │
│  │ Procesar fotos  │  │ Push cambios │  │ Stock bajo         │    │
│  │ Extraer texto   │  │ Pull cambios │  │ Ventas grandes     │    │
│  │ Clasificar AI   │  │ Resolver     │  │ Recordatorios      │    │
│  │                 │  │ conflictos   │  │                    │    │
│  └────────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                    │
│  ┌────────────────┐  ┌──────────────┐                             │
│  │ report-queue   │  │ email-queue  │                             │
│  │ (reportes)     │  │ (correos)    │                             │
│  ├────────────────┤  ├──────────────┤                             │
│  │ Generar PDF    │  │ Enviar email │                             │
│  │ Exportar Excel │  │ Notificar    │                             │
│  │ Enviar reporte │  │ proveedores  │                             │
│  └────────────────┘  └──────────────┘                             │
└────────────────────────────────────────────────────────────────────┘
```

### Configuración de colas:

```typescript
// photo-queue: Procesamiento de imágenes
const photoQueue = new Queue('photo-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 120_000,          // 2 minutos por foto
    removeOnComplete: { age: 3600 * 24, count: 100 },
  },
});

// sync-queue: Sincronización offline
const syncQueue = new Queue('device-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 30_000,
    removeOnComplete: { age: 3600 * 24 * 7, count: 1000 },
  },
});

// notification-queue: Alertas y notificaciones
const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10_000 },
    timeout: 15_000,
  },
});
```

---

## 6. Arquitectura completa (BD + Caché + Colas)

```
                    ┌────────────────────────┐
                    │      CLIENTES          │
                    │                        │
                    │  React Native (Mobile) │
                    │  React Web (PWA)       │
                    └───────────┬────────────┘
                                │
                   ┌────────────┴────────────┐
                   │       API REST          │
                   │   (Node.js / Express)   │
                   └────────────┬────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
  ┌───────────────┐    ┌───────────────┐    ┌──────────────────┐
  │   Supabase    │    │    Redis      │    │   Supabase       │
  │  PostgreSQL   │    │              │    │   Storage        │
  │               │    │  ┌────────┐  │    │   (Fotos)        │
  │  - stores     │    │  │ BullMQ │  │    └──────────────────┘
  │  - products   │    │  │ queues │  │
  │  - sales      │◄──►│  └────────┘  │
  │  - sync_queue │    │              │
  │  - photos     │    │  Cache (futuro)│
  └───────────────┘    └───────────────┘
```

### Stack completo propuesto:

| Componente | Tecnología | Propósito |
|---|---|---|
| **BD principal** | Supabase (PostgreSQL) | Datos relacionales + JSONB |
| **Cache** | Redis (solo para colas al inicio) | BullMQ + en el futuro, caché |
| **Cola de trabajos** | BullMQ | OCR, sync, notificaciones |
| **File storage** | Supabase Storage (S3) | Fotos de productos |
| **Autenticación** | Supabase Auth | JWT, RLS, social login |
| **Realtime** | Supabase Realtime (WebSockets) | Notificaciones en vivo |
| **Sync offline** | WatermelonDB (cliente) + Supabase (servidor) | Operación sin internet |

---

## 7. Conclusión

| Decisión | Opción elegida | Por qué |
|---|---|---|
| **Base de datos** | **Supabase (PostgreSQL + JSONB)** | Datos relacionales + flexibilidad JSON + auth/storage/realtime incluidos + sync nativo con WatermelonDB |
| **Cache** | **Redis (solo para BullMQ)** | Las colas son necesarias desde el día 1. Caché no, se añade después si hay cuello de botella |
| **Cola de trabajos** | **BullMQ** | La solución más madura para Node.js. Retry + backoff + DLQ + dashboard (Bull Board) |

**Resumen:** Supabase + BullMQ + Redis forman un stack coherente, económico (~$30-40/mes), open-source, y perfecto para aplicaciones offline-first con procesamiento de imágenes y sincronización de dispositivos.
