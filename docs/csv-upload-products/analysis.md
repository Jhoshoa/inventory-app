# CSV Upload de Productos — Análisis y Plan de Implementación

## 1. Resumen

Se implementa un endpoint `POST /products/import` que recibe un archivo CSV, lo valida en su totalidad, y si no hay errores inserta todos los productos en una sola transacción atómica. Se persiste un `ImportJob` con el resultado para tracking y polling. La UI agrega un modal drag & drop en la página de productos con estados trackeables.

Decisión arquitectónica: **síncrono con ImportJob + polling**. Procesa inline dentro del request, pero persiste el resultado para que el frontend pueda consultar el estado. Sin colas ni workers adicionales. Cuando la aplicación crezca, se migra a ARQ + Redis cambiando solo el endpoint (el modelo `ImportJob` y el polling del frontend quedan igual).

---

## 2. Formato del CSV

### Columnas (en orden recomendado)

| Columna | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `name` | string (1-100) | **Sí** | — | Se normaliza con `normalize_product_name()` |
| `price` | decimal (>0) | **Sí** | — | Formato: `1234.56` |
| `stock` | integer (>=0) | **Sí** | — | |
| `category` | string (1-50) | No | `null` | Nombre exacto de categoría existente. Se resuelve por nombre (case-insensitive) |
| `category_id` | UUID | No | `null` | Alternativa a `category`. Si se dan ambos, deben coincidir |
| `sku` | string (1-50) | No | auto-generado | Si se omite y `category_id` está presente, se auto-genera vía `reserve_next_sku()` |
| `unit` | string (1-20) | No | `"unidad"` | |
| `min_stock` | integer (>=0) | No | `5` | |
| `cost_price` | decimal (>=0) | No | `null` | |
| `qr_code` | string (1-100) | No | auto-generado | Si se omite, se genera `P-{12 hex chars uppercase}` |
| `photo_url` | string (max 500) | No | `null` | URL de imagen |

> **`id`** no se incluye en el CSV. Se genera automáticamente con `uuid4()`.

### Archivo de ejemplo

```csv
name,price,stock,category,sku,unit,min_stock,cost_price,qr_code,photo_url
"Jabon Liquido 500ml",12.50,100,"Limpieza","JAB-001","unidad",10,8.00,QR-JAB001,https://example.com/jabon.jpg
"Arroz 1kg",8.90,200,"Alimentos","ARZ-001","unidad",20,6.50,,
"Detergente 1L",15.00,75,"Limpieza",,"unidad",10,,,
```

---

## 3. Endpoints

### `POST /api/v1/products/import`

**Auth:** `require_owner`

**Content-Type:** `multipart/form-data`

**Parámetro:** `file` — archivo CSV (`.csv`)

**Respuesta (201):** `ImportJob` creado. El job se procesa inline (síncrono) antes de responder.

```json
{
  "id": "uuid-del-job",
  "status": "completed",
  "total_rows": 150,
  "imported_count": 150,
  "error_count": 0,
  "errors": [],
  "filename": "productos.csv",
  "created_at": "2026-07-07T15:00:00Z",
  "completed_at": "2026-07-07T15:00:05Z"
}
```

**Respuesta con errores (201 — el job se completa pero con errores):**

```json
{
  "id": "uuid-del-job",
  "status": "completed",
  "total_rows": 150,
  "imported_count": 0,
  "error_count": 3,
  "errors": [
    { "row": 3, "field": "price", "message": "El precio debe ser un numero valido mayor a 0" },
    { "row": 5, "field": "sku", "message": "El SKU ARZ-001 ya esta en uso por otro producto" },
    { "row": 10, "field": "name", "message": "El nombre del producto es requerido" }
  ],
  "filename": "productos.csv",
  "created_at": "2026-07-07T15:00:00Z",
  "completed_at": "2026-07-07T15:00:05Z"
}
```

### `GET /api/v1/products/import/{job_id}`

**Auth:** `require_owner`

Retorna el `ImportJob` con su estado actual. Para polling del frontend.

### `GET /api/v1/products/import`

**Auth:** `require_owner`

Retorna historial de jobs del store (ordenado por fecha descendente, limitado a 50).

---

## 4. Estrategia transaccional: ALL-OR-NOTHING

### Decisión: **Validar todo primero, luego insertar todo en una transacción**

**Por qué:**
- El CSV es una operación administrativa masiva, no una operación de punto de venta en tiempo real.
- El usuario sube un archivo esperando que **todo** funcione o **todo** falle. Si algunos productos se insertan y otros no, el estado queda inconsistente.
- Errores parciales obligan al usuario a múltiples viajes (subir, ver qué falló, adivinar qué se insertó, corregir, subir de nuevo).
- El volumen esperado es moderado (cientos, no millones), mantener todo en memoria para validar no es problema.

### Alternativas descartadas

| Alternativa | Razón |
|---|---|
| Insertar fila por fila, reportar errores inline | Estado inconsistente; difícil de auditar |
| Batch de N filas con rollback por batch | Más complejo; útil solo para archivos >10k filas |

### Análisis de rendimiento (sync vs async)

| Escenario | Tiempo estimado para 5,000 filas |
|---|---|
| Parsear CSV en memoria | < 100ms |
| Validar estructura (5,000 filas) | < 50ms |
| Validar negocio (5,000 checks batch) | ~200-500ms |
| Insertar 5,000 productos (1 transacción) | ~3-5s (PostgreSQL) |
| **Total** | **~4-6s** |

Límite práctico: **10,000 filas por archivo** (~12s, bajo timeout de gunicorn de 120s). Con 5 workers de gunicorn en el VPS, soporta **5 uploads concurrentes** sin degradación significativa.

### Decisión: Síncrono para MVP

| Opción | Complejidad | Infra adicional | Escala |
|---|---|---|---|
| **Síncrono + ImportJob + polling** ✅ | Baja | Nada | ~10k rows/request |
| FastAPI BackgroundTasks | Baja | Nada | No persistente |
| ARQ + Redis | Media | Redis (~50MB RAM) | ~50k+, concurrente |
| Celery + RabbitMQ | Alta | RabbitMQ/Redis | Ilimitado (workers separados) |
| AWS Lambda + S3 + SQS | Muy alta | Toda infra AWS | Ilimitado |

> **Migrar a ARQ + Redis cuando:** (a) stores con >5,000 productos, (b) 2+ owners subiendo CSV simultáneamente sea normal, o (c) ya se necesite Redis para otra cosa (caché, rate limiting). El `ImportJob` + polling ya está diseñado para que el frontend no cambie.

---

## 5. ImportJob — Entidad y Modelo

### Domain entity: `ImportJob`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `store_id` | UUID | FK a store |
| `user_id` | UUID | FK a user |
| `status` | `ImportJobStatus` | `validating` → `inserting` → `completed` |
| `total_rows` | int | Filas parseadas del CSV |
| `imported_count` | int | Productos insertados exitosamente |
| `error_count` | int | Cantidad de errores |
| `errors` | list[RowError] | Lista de errores (serializada como JSON) |
| `filename` | str | Nombre original del archivo |
| `created_at` | datetime | |
| `completed_at` | datetime | null mientras no termine |

```python
class ImportJobStatus(StrEnum):
    VALIDATING = "validating"
    INSERTING = "inserting"
    COMPLETED = "completed"
```

### `RowError`

```python
@dataclass
class RowError:
    row: int
    field: str
    message: str
```

### SQLAlchemy model: `ImportJobModel`

Tabla `import_jobs`. Almacena `errors` como `JSON` column.

---

## 6. Validaciones Detalladas

### 6.1 Validaciones estructurales (por fila)

| Campo | Validación | Error |
|---|---|---|
| `name` | No vacío, ≤ 100 chars | `El nombre es requerido` / `debe tener maximo 100 caracteres` |
| `price` | Parseable a Decimal, > 0 | `El precio debe ser un numero valido mayor a 0` |
| `stock` | Parseable a int, ≥ 0 | `El stock debe ser un numero entero >= 0` |
| `category` | Si presente, ≤ 50 chars | `La categoria debe tener maximo 50 caracteres` |
| `category_id` | Si presente, UUID válido | `category_id debe ser un UUID valido` |
| `sku` | Si presente, ≤ 50 chars | `El SKU debe tener maximo 50 caracteres` |
| `unit` | Si presente, ≤ 20 chars | `La unidad debe tener maximo 20 caracteres` |
| `min_stock` | Si presente, int ≥ 0 | `min_stock debe ser un numero entero >= 0` |
| `cost_price` | Si presente, Decimal ≥ 0 | `cost_price debe ser un numero valido >= 0` |
| `qr_code` | Si presente, ≤ 100 chars | `qr_code debe tener maximo 100 caracteres` |
| `photo_url` | Si presente, ≤ 500 chars | `photo_url debe tener maximo 500 caracteres` |

### 6.2 Validaciones de negocio

| Validación | Scope | Error |
|---|---|---|
| `category_id` existe + activa | DB | `Categoria {id} no encontrada` |
| `category` existe por nombre (lowercase) | DB | `Categoria '{name}' no encontrada` |
| SKU único intra-CSV | Intra-CSV | `SKU duplicado en filas: {rows}` |
| SKU único contra DB (store_id) | DB | `El SKU {sku} ya esta en uso` |
| QR único intra-CSV | Intra-CSV | `QR duplicado en filas: {rows}` |
| QR único contra DB | DB | `El codigo escaneable {qr} ya esta en uso` |
| `category_id` vs `category` consistente | Intra-fila | `category_id y category no coinciden` |

### 6.3 Generación automática

| Campo | Auto-generado cuando |
|---|---|
| `id` | Siempre — `uuid4()` |
| `sku` | Si no se da y hay `category_id` válido → `reserve_next_sku()` |
| `qr_code` | Si no se da → `P-{uuid4().hex[:12].upper()}` |
| `version` | Siempre — `1` |
| `category` | Si se resuelve por `category_id`, se copia el nombre |

---

## 7. Flujo de Procesamiento (ImportProductsCsvUseCase)

```
execute(store_id, filename, csv_content)

 1. Parsear CSV → list[RawProductRow]
 2. job.status = VALIDATING
 3. Validar estructura (tipos, rangos, required)
 4. Si errores estructurales:
      job.status = COMPLETED, errors = estructurales
      persistir job, retornar
 5. Validar negocio contra DB (batch queries):
      a. Cargar categorías del store (cache en dict)
      b. SKU/QR duplicados intra-CSV
      c. SKU/QR duplicados contra DB
      d. Resolver category por nombre
 6. Si errores de negocio:
      job.status = COMPLETED, errors = negocio
      persistir job, retornar
 7. Generar QR codes faltantes (verificar colisiones)
 8. job.status = INSERTING, persistir
 9. Insertar todo en transacción atómica:
      session.begin()
      for each row:
          reserve_next_sku si aplica
          Product.create(...)
          repo.save() → flush
      session.commit()
 10. job.status = COMPLETED, imported_count = N
     job.completed_at = now
     persistir job
     retornar resultado
```

### `reserve_next_sku` dentro de la transacción

Usa `SELECT ... FOR UPDATE`. Se ejecuta dentro del `session.begin()` del paso 9, no en la validación. Esto es correcto porque:
- La validación previa ya verificó que la categoría existe y está activa
- El `FOR UPDATE` lockea la fila hasta que la transacción termine
- Si dos imports concurrentes tocan la misma categoría, una espera a la otra

---

## 8. Límites y Seguridad

| Aspecto | Límite | Razón |
|---|---|---|
| Tamaño máximo | 5 MB | ~15k productos; evita DoS |
| Filas máximas | 5,000 | Tiempo de procesamiento en un request |
| Timeout endpoint | 60s | Suficiente para 5,000 filas |
| Solo `.csv` | `text/csv` o `application/vnd.ms-excel` | Evita scripts maliciosos |
| Eliminar BOM | Al inicio | Compatibilidad Excel Windows |
| Encoding | UTF-8 (con/sin BOM) | Estándar |

---

## 9. Arquitectura del Use Case

```python
@dataclass
class RawProductRow:
    row_number: int
    name: str | None
    price: str | None
    stock: str | None
    category: str | None
    category_id: str | None
    sku: str | None
    unit: str | None
    min_stock: str | None
    cost_price: str | None
    qr_code: str | None
    photo_url: str | None

@dataclass
class ParsedProductRow:
    row_number: int
    name: str
    price: Decimal
    stock: int
    category: str | None
    category_id: UUID | None
    sku: str | None
    unit: str
    min_stock: int
    cost_price: Decimal | None
    qr_code: str | None
    photo_url: str | None

@dataclass
class RowError:
    row: int
    field: str
    message: str

@dataclass
class ImportResult:
    imported: int
    errors: list[RowError]

class ImportProductsCsvUseCase:
    def __init__(self, session: AsyncSession,
                 product_repo: IProductRepository,
                 category_repo: IProductCategoryRepository,
                 job_repo: IImportJobRepository):
        ...

    async def execute(self, store_id: UUID, user_id: UUID,
                      filename: str, content: str) -> ImportJob:
        # 1. Crear job con status=validating
        # 2. Parsear y validar
        # 3. Si errores → job.completed con errores
        # 4. Si ok → insertar en transacción
        # 5. job.completed con imported_count
        # 6. Retornar job
```

---

## 10. Archivos a Modificar/Crear

### Backend (7 archivos nuevos, 4 modificados)

| Archivo | Acción |
|---|---|
| `src/domain/entities/import_job.py` | **Crear** — `ImportJob`, `ImportJobStatus`, `RowError` |
| `src/domain/repositories/import_job_repository.py` | **Crear** — `IImportJobRepository` interface |
| `src/infrastructure/database/models/import_job_model.py` | **Crear** — `ImportJobModel` |
| `src/infrastructure/database/repositories/import_job_repository.py` | **Crear** — `ImportJobRepository` |
| `src/application/use_cases/products/import_products_csv.py` | **Crear** — `ImportProductsCsvUseCase` |
| Migración Alembic | **Crear** — tabla `import_jobs` |
| `src/application/dto/product_dto.py` | **Modificar** — agregar `ImportJobResponseDTO`, `RowErrorDTO` |
| `src/presentation/api/v1/products.py` | **Modificar** — agregar endpoints |
| `src/presentation/dependencies.py` | **Modificar** — agregar `get_import_job_repo` |
| `src/infrastructure/database/models/__init__.py` | **Modificar** — exportar `ImportJobModel` |
| `src/presentation/api/v1/router.py` | (no necesita cambios, ya incluye products.router) |

### Web (3 archivos nuevos, 2 modificados)

| Archivo | Acción |
|---|---|
| `src/features/products/types.ts` | **Modificar** — agregar `ImportJob`, `ImportJobStatus`, `RowError` |
| `src/features/products/api.ts` | **Modificar** — agregar `importProductsCsv`, `getImportJob`, `listImportJobs` |
| `src/features/products/components/ProductCsvImportDialog.tsx` | **Crear** — modal drag & drop con estados |
| `app/(app)/dashboard/products/page.tsx` | **Modificar** — agregar botón "Importar CSV" |

---

## 11. UI Propuesta: `ProductCsvImportDialog`

### Estados del modal

```
IDLE ──→ UPLOADING ──→ VALIDATING ──→ INSERTING ──→ COMPLETED
                                          │               │
                                          │           [Success]
                                          │
                                      [Failed] ←── COMPLETED (with errors)
```

### Estado IDLE (antes de subir)

```
┌──────────────────────────────────────────────┐
│  Importar productos desde CSV                 │
│                                               │
│  ┌──────────────────────────────────────────┐ │
│  │  +                                       │ │
│  │  Arrastra tu archivo CSV aqui            │ │
│  │  o haz clic para seleccionar archivo     │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  [Descargar template]        [Cancelar][Subir]│
└──────────────────────────────────────────────┘
```

### Estado UPLOADING / VALIDATING / INSERTING

```
┌──────────────────────────────────────────────┐
│  Importando productos...                      │
│                                               │
│  [spinner]                                    │
│                                               │
│  Estado: Validando filas...                   │
│  Archivo: productos.csv                       │
│                                               │
│  [Cancelar]                                   │
└──────────────────────────────────────────────┘
```

### Estado COMPLETED (éxito)

```
┌──────────────────────────────────────────────┐
│  Importacion completada                       │
│                                               │
│  ✅  150 productos importados                 │
│                                               │
│  [Cerrar]                                     │
└──────────────────────────────────────────────┘
```

### Estado COMPLETED (con errores)

```
┌──────────────────────────────────────────────┐
│  Error al importar productos                  │
│                                               │
│  ⚠ Se encontraron 4 errores.                 │
│  Ningun producto fue importado.               │
│  Corrige el archivo e intenta de nuevo.       │
│                                               │
│  Fila │ Campo     │ Mensaje                   │
│  ─────┼───────────┼───────────────────────────│
│   3   │ price     │ debe ser mayor a 0        │
│   5   │ sku       │ ya esta en uso            │
│   7   │ name      │ requerido                 │
│  10   │ category  │ no encontrada             │
│                                               │
│  [Descargar errores]        [Cerrar]          │
└──────────────────────────────────────────────┘
```

### Botón en página de productos

```
[Imprimir etiquetas] [Importar CSV] [Nuevo producto]
```

Solo visible para owners. Abre el `ProductCsvImportDialog`.

---

## 12. Tests

### Backend (pytest)

| Test | Descripción |
|---|---|
| `test_import_csv_success` | CSV válido de 3 productos → `imported=3` |
| `test_import_csv_empty_file` | Archivo vacío → error |
| `test_import_csv_missing_name` | Fila sin `name` → error estructural |
| `test_import_csv_invalid_price` | `price="abc"` → error de parseo |
| `test_import_csv_negative_stock` | `stock=-1` → error |
| `test_import_csv_duplicate_sku_intra_csv` | Dos filas con mismo SKU → error |
| `test_import_csv_duplicate_sku_against_db` | SKU ya existe en DB → error |
| `test_import_csv_nonexistent_category` | `category="Fake"` → error |
| `test_import_csv_auto_generate_sku` | Sin SKU con `category_id` → SKU auto-generado |
| `test_import_csv_auto_generate_qr` | Sin `qr_code` → QR auto-generado |
| `test_import_csv_atomic` | Si falla insert #50, ningún producto insertado |
| `test_import_csv_max_rows_exceeded` | 5001 filas → error |
| `test_import_job_polling` | GET /products/import/{id} retorna el job |

---

## 13. Consideraciones Futuras

- **Import asíncrono con ARQ + Redis:** Migrar cuando sea necesario. El `ImportJob` está diseñado para que el frontend no cambie.
- **Mode upsert:** Extender con `mode: "create" | "upsert"` que actualice por SKU.
- **Encoding detection:** Si usuarios usan Excel con Latin-1, agregar `chardet`.
- **Notificaciones:** Webhook o toast cuando un import async termine.
