# Análisis: Estrategia Offline-First para Conexión Intermitente

## Contexto: El problema de internet en Bolivia

| Situación | Frecuencia | Impacto |
|---|---|---|
| Internet lento (< 1 Mbps) | Alta en zonas urbano-populares | Sincronización lenta |
| Cortes repentinos de WiFi | Muy alta | Datos perdidos si no hay offline |
| Sin señal en sótanos/galerías | 100% en esos lugares | App inusable sin offline |
| Datos móviles caros/inestables | Alto | Sincronizar solo lo necesario |
| Sin internet en ferias/mercados | Común | Operación diaria afectada |

**Conclusión:** La app DEBE funcionar **sin internet el 100% del tiempo** para operaciones críticas (registrar ventas, consultar stock). El internet solo se necesita para sincronizar.

---

## 1. Arquitectura General Offline-First

### Principio fundamental

> **El dispositivo es la fuente de verdad (Source of Truth). El servidor es un respaldo que eventualmente se sincroniza.**

No al revés. La UI siempre lee y escribe en la base de datos LOCAL. La red es un "bonus" que aparece cuando puede.

```
┌─────────────────────────────────────────────────────────────────┐
│                         DISPOSITIVO                             │
│                                                                 │
│  ┌──────────┐    ┌──────────────────────┐    ┌───────────────┐  │
│  │   UI     │◄──►│  Base de Datos LOCAL │◄──►│ Sync Engine   │  │
│  │ (React)  │    │  (SQLite / IndexedDB) │    │ (Background)  │  │
│  └──────────┘    └──────────────────────┘    └───────┬───────┘  │
│                                                       │         │
│                                        ┌──────────────┴──────┐  │
│                                        │  Cola de Sincroniz. │  │
│                                        │  (Sync Queue)       │  │
│                                        └──────────────┬──────┘  │
└───────────────────────────────────────────────────────┼─────────┘
                                                         │
                                              ╔══════════╧══════════╗
                                              ║  INTERNET (cuando   ║
                                              ║  hay conexión)      ║
                                              ╚══════════╤══════════╝
                                                         │
                                                  ┌──────┴──────┐
                                                  │  SERVIDOR   │
                                                  │  (Backend)  │
                                                  │ PostgreSQL  │
                                                  └─────────────┘
```

### Tecnologías recomendadas

| Capa | Mobile App (React Native) | Web App (React PWA) |
|---|---|---|
| **BD Local** | WatermelonDB (SQLite nativo) o Expo SQLite | IndexedDB via Dexie.js |
| **Sync Engine** | WatermelonDB Sync Protocol (custom) + NetInfo | Service Worker + Background Sync API |
| **Cola de sync** | Tabla `sync_queue` en SQLite | IndexedDB + Background Sync |
| **Network detector** | `@react-native-community/netinfo` | `navigator.onLine` + `online/offline` events |

---

## 2. Estrategia de Sincronización

### 2.1 Modelo de datos con metadatos de sync

Cada tabla debe incluir **4 campos de control** para sincronización:

```sql
-- Ejemplo: tabla de ventas
CREATE TABLE sales (
  id          TEXT PRIMARY KEY,          -- UUID generado LOCALMENTE
  items       TEXT,                       -- JSON con productos vendidos
  total       REAL,
  payment_method TEXT,
  created_at  TEXT,
  updated_at  TEXT,
  -- Metadatos de sync
  synced      INTEGER DEFAULT 0,         -- 0=pendiente, 1=sincronizado
  sync_status TEXT DEFAULT 'pending',    -- pending | syncing | failed | synced
  version     INTEGER DEFAULT 1,         -- Para conflict resolution
  last_sync_attempt TEXT,                 -- Timestamp del último intento
  deleted_at  TEXT                        -- Soft delete (tombstone)
);
```

### 2.2 Flujo de escritura (registrar una venta offline)

```
1. Usuario hace clic en "Vender"
2. App descuenta stock LOCALMENTE
3. App genera registro de venta con UUID local
4. App guarda en SQLite local con synced=0
5. UI se actualiza al instante (optimistic update)
6. Sync Engine encola la operación: { type: 'CREATE', table: 'sales', data: {...} }
7. Si hay internet → sincroniza inmediatamente
8. Si no hay internet → queda en cola para después
```

### 2.3 Flujo de sincronización (cuando hay internet)

```
CONEXIÓN RESTAURADA
    │
    ├── 1. NetInfo detecta conexión
    │
    ├── 2. Sync Engine se activa
    │       │
    │       ├── 2a. PUSH: Enviar cambios locales al servidor
    │       │     ┌──────────────────────────────────────────┐
    │       │     │ POST /api/sync/push                      │
    │       │     │ {                                        │
    │       │     │   cambios: [{                            │
    │       │     │     tabla: 'sales',                      │
    │       │     │     operacion: 'CREATE',                 │
    │       │     │     datos: { id, items, total, ... },    │
    │       │     │     version: 1,                          │
    │       │     │     timestamp: "2026-05-11T10:30:00Z"    │
    │       │     │   }]                                     │
    │       │     │ }                                        │
    │       │     │                                          │
    │       │     │ ← OK / Conflict                          │
    │       │     └──────────────────────────────────────────┘
    │       │
    │       ├── 2b. PULL: Obtener cambios del servidor
    │       │     ┌──────────────────────────────────────────┐
    │       │     │ POST /api/sync/pull                      │
    │       │     │ {                                        │
    │       │     │   lastPulledAt: 1715000000                │
    │       │     │ }                                        │
    │       │     │                                          │
    │       │     │ ← {                                      │
    │       │     │   cambios: [{ tabla, datos, version }],  │
    │       │     │   timestamp: 1715000123                  │
    │       │     │ }                                        │
    │       │     └──────────────────────────────────────────┘
    │       │
    │       └── 2c. Resolver conflictos si los hay
    │
    ├── 3. Actualizar BD local con datos del servidor
    │
    └── 4. Marcar synced=1 en registros locales
```

### 2.4 Estrategias de reintento (Retry)

```
Intento 1:  Esperar 1 segundo    → falla
Intento 2:  Esperar 2 segundos   → falla
Intento 3:  Esperar 4 segundos   → falla
Intento 4:  Esperar 8 segundos   → falla
Intento 5:  Esperar 16 segundos  → falla
Intento 6+: Esperar 30 segundos  (máximo)
```

**Exponencial backoff + jitter** para no saturar la red cuando reaparece.

Además:
- **Máximo 10 reintentos** antes de marcar como `sync_status = 'failed'`
- Si falla, el usuario ve un **indicador visual** 🟡 "Pendiente de sincronizar"
- El usuario puede forzar sync manual con un botón "🔄 Sincronizar ahora"

---

## 3. Sincronización a nivel de campo (no de registro completo)

**Problema:** Dos dispositivos modifican el mismo producto offline.

**Solución:** Enviar **solo los campos modificados** + merge por campo.

```json
{
  "tabla": "products",
  "id": "prod_001",
  "operacion": "UPDATE",
  "cambios": {
    "precio": 15.50,
    "stock": 48
  },
  "campos_modificados": ["precio", "stock"],
  "version": 3,
  "timestamp": "2026-05-11T10:30:00Z",
  "dispositivo": "dispositivo_abc_123"
}
```

- Si el **mismo campo** fue modificado en 2 dispositivos → gana el **timestamp más reciente**
- Si son **campos distintos** → ambos cambios sobreviven (merge automático)
- El usuario **nunca pierde datos**

---

## 4. Almacenamiento local: ¿Cuánto necesitamos?

| Tipo de dato | Tamaño estimado | Frecuencia |
|---|---|---|
| Productos (200 items) | ~1-2 MB | Una vez (carga inicial) |
| Ventas (50/día) | ~5 MB/mes | Diario |
| Fotos de productos (200) | ~200-400 MB | Una vez |
| QR codes generados | ~1 MB | Una vez |
| **Total estimado** | **~200-500 MB** | **Aceptable en cualquier celular** |

Los celulares actuales en Bolivia tienen mínimo 32-64 GB. 500 MB es **menos del 2%**.

---

## 5. Manejo de Fotos Offline

Las fotos son el dato más pesado. Estrategia:

```
1. Usuario toma foto desde la app
2. Se guarda LOCALMENTE en el sistema de archivos del dispositivo
    └── /data/com.tuinventario/photos/<uuid>.jpg
3. Se muestra inmediatamente en la UI (ruta local)
4. Cuando hay internet:
    a. Se comprime la imagen (80% calidad, max 800px)
    b. Se sube al servidor
    c. El servidor devuelve la URL pública
    d. Se actualiza la BD local con la URL remota
    e. La foto local se puede borrar (opcional)
```

---

## 6. Indicadores de Estado en la UI (UX Crítico)

El usuario DEBE saber en todo momento qué está pasando con la conexión:

```
┌──────────────────────────────────────┐
│  📱 Mi Tienda "La Económica"         │
│                                       │
│  🔵 Sincronizado    Última sync: 2m  │  ← Todo bien, conectado
│                                       │
│  🟡 3 ventas pendientes              │  ← Hay datos sin subir
│                                       │
│  🔴 Sin conexión     │  Modo offline │  ← Sin internet
│                                       │
│  ⚠️ Error al sync    │  [Reintentar] │  ← Falló la sincronización
│                                       │
│  ┌──────────────────────────────┐    │
│  │  PRODUCTOS (48 disponibles)  │    │
│  │  ┌──────────────────────┐    │    │
│  │  │ Arroz 10bs  │ 🟢 20und│    │    │  ← Stock actualizado
│  │  │ Aceite 25bs │ 🟡 15und│    │    │  ← Pendiente de sync
│  │  │ Fideo  8bs  │ ⚠️ 0und  │    │    │  ← Sin stock
│  │  └──────────────────────┘    │    │
│  └──────────────────────────────┘    │
│                                       │
│  [➕ Vender]  [🔄 Sync]  [📊 Reportes]│
└──────────────────────────────────────┘
```

### Criterios de UI offline:

| Estado | Acción del Sistema | Feedback al Usuario |
|---|---|---|
| **Online** | Sync automático cada 30s | Indicador verde + hora última sync |
| **Offline** | Todo funciona local. Se encola | Indicador rojo + "Modo sin conexión" |
| **Offline + cola llena** | Sigue funcionando | Contador: "14 ventas por sincronizar" |
| **Reconexión** | Sync automático inmediato | Animación de sync + notificación |
| **Error de sync** | Reintenta con backoff | Botón "Reintentar" + alerta con detalle |

---

## 7. Conflictos y Casos Extremos

### 7.1 Dos vendedores venden el mismo producto offline

```
Situación:
  Producto: Arroz, stock inicial: 50
  Vendedor A (offline) vende 20 → stock local: 30
  Vendedor B (offline) vende 15 → stock local: 35

Cuando ambos sincronizan:

  Servidor recibe: A vendió 20, B vendió 15
  Cálculo correcto: 50 - 20 - 15 = 15
  ❌ Si usamos "último que escribe gana" → stock quedaría en 35 (incorrecto)

  ✅ Solución: NO usar "last-write-wins" para STOCK.
     Usar "delta sync": en lugar de enviar el stock absoluto,
     enviar el Δ (delta) de la operación:
     
     Vendedor A envía: { producto: "arroz", delta: -20 }
     Vendedor B envía: { producto: "arroz", delta: -15 }
     Servidor calcula: 50 + (-20) + (-15) = 15 ✅
```

### 7.2 Soft delete (tombstones)

```sql
-- No se borran registros, se marcan como eliminados
UPDATE products SET deleted_at = '2026-05-11T10:30:00Z', synced = 0 WHERE id = 'prod_001';
```

El servidor recibe el tombstone y replica la eliminación. Los tombstones viejos (>30 días) se purgan.

### 7.3 ID único por dispositivo

```json
{
  "id": "venta_a1b2c3_20260511_001",
  "dispositivo_id": "disp_abc_123",
  "timestamp_local": "2026-05-11T10:30:00.000Z",
  "tienda_id": "tienda_001"
}
```

El `id` se genera localmente con UUID v4 para evitar colisiones. El `dispositivo_id` permite rastrear qué dispositivo creó qué registro.

---

## 8. Implementación por plataforma

### 8.1 Mobile App (React Native)

| Librería | Propósito |
|---|---|
| `@nozbe/watermelondb` | Base de datos local SQLite + sync protocol |
| `@react-native-community/netinfo` | Detectar cambios en conectividad |
| `react-native-background-fetch` | Sync en segundo plano periódico |
| `react-native-fs` | Almacenar fotos localmente |
| WatermelonDB Sync Protocol | Push/Pull bidireccional con el servidor |

**Ciclo de sync:**

```
1. AppState cambia a "active" (usuario abre la app) → sync
2. NetInfo detecta "online" → sync
3. Cada 5 minutos en background → sync (solo si hay conexión)
4. Usuario presiona "Sync manual" → sync forzado
5. Después de cada venta registrada → intento de sync inmediato
```

### 8.2 Web App (React PWA)

| API | Propósito |
|---|---|
| `IndexedDB` (via Dexie.js) | Base de datos local en el navegador |
| `Service Worker` | Cache de assets + lógica offline |
| `Background Sync API` | Sync automático cuando hay conexión |
| `navigator.onLine` + eventos | Detectar conectividad |

**Limitaciones de la PWA vs Mobile App:**

| Aspecto | PWA | Mobile App |
|---|---|---|
| **Almacenamiento local** | Hasta 50%-80% del disco (limitado) | Ilimitado |
| **Background Sync** | Limitado (depende del navegador) | Total |
| **Fotos offline** | Cache temporal | Almacenamiento completo |
| **Robustez offline** | Media (navegador puede cerrar) | Alta |
| **Instalación** | Automática (navegador) | App Store / APK |

**Recomendación para Bolivia:**
- **App nativa (React Native) para uso diario** → offline robusto, sin depender del navegador
- **Web app (PWA) como complemento** → para consultas rápidas en PC, carga inicial de fotos, y administración

### 8.3 Backend (API)

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/sync/push` | POST | Recibir cambios locales de los dispositivos |
| `/api/sync/pull` | POST | Enviar cambios del servidor al dispositivo |
| `/api/sync/status/:deviceId` | GET | Estado de sync del dispositivo |
| `/api/products` | CRUD | API normal (legacy, para consultas) |

---

## 9. Consumo de datos móviles (crítico en Bolivia)

| Operación | Datos móviles consumidos |
|---|---|
| Sync de 1 venta (texto) | ~1-3 KB |
| Sync de 50 ventas acumuladas | ~50-150 KB |
| Subir 1 foto (comprimida 800px) | ~200-500 KB |
| Sync completo de catálogo (200 items) | ~50-100 KB |
| Pull de cambios del servidor (diario) | ~10-50 KB |
| **Estimado mensual (200 ventas + 50 fotos)** | **~10-50 MB** |

Comparado con redes sociales:
- TikTok: ~1.5 GB/mes
- WhatsApp: ~500 MB/mes
- **Nuestra app: ~10-50 MB/mes** ← MUY eficiente

---

## 10. Plan de implementación por fases

### Fase 1: Mínimo viable offline (Sprint 1-2)

```
✅ Base de datos local (SQLite / WatermelonDB)
✅ Operaciones CRUD locales (crear producto, registrar venta)
✅ Indicador de conexión (online/offline)
✅ Cola de sync básica (push)
✅ Botón de sync manual
```

### Fase 2: Sync automático (Sprint 3-4)

```
✅ NetInfo para detectar cambios de conexión
✅ Sync automático al reconectar
✅ Pull de cambios del servidor
✅ Indicador de "X items pendientes de sync"
✅ Exponencial backoff en reintentos
```

### Fase 3: Fotos y conflictos (Sprint 5-6)

```
✅ Almacenamiento local de fotos
✅ Subida diferida de fotos cuando hay WiFi
✅ Compresión automática de imágenes
✅ Delta sync para stock (conflict resolution)
✅ Tombstones para eliminaciones
```

### Fase 4: Madurez (Sprint 7+)

```
✅ Background sync periódico
✅ Conflict UI (mostrar al usuario si hay conflicto irresoluble)
✅ Dashboard de sync en servidor (ver qué dispositivos están atrasados)
✅ Compresión y batching de operaciones
✅ Cifrado de datos locales (para seguridad)
```

---

## 11. Conclusión

| Aspecto | Estrategia |
|---|---|
| **📱 App principal** | React Native (offline completo) |
| **🌐 Web app** | PWA como complemento administrativo |
| **💾 BD Local** | WatermelonDB (Mobile) / Dexie.js (Web) |
| **🔄 Sync** | Push + Pull protocol con delta sync |
| **📸 Fotos** | Local first → subida diferida con compresión |
| **⚡ Conflictos** | Delta sync para stock, timestamp merge para campos |
| **📊 Datos móviles** | Optimizado (~10-50 MB/mes) |
| **🔁 Reintentos** | Exponencial backoff 1s→30s, max 10 intentos |
| **🖥️ UX** | Indicadores de estado siempre visibles + sync manual |

**En resumen:** La app debe funcionar **exactamente igual** con o sin internet para operaciones críticas. La única diferencia es que sin internet los datos se quedan en el dispositivo hasta que haya conexión. El usuario **nunca debe quedarse bloqueado** por falta de internet.
