# Sprint 4 Assisted Import Plan

Fecha: 2026-05-19

## Objetivo

Convertir el OCR actual en un flujo persistente y revisable para importar inventario desde fotos de hojas, listas o planillas impresas. Sprint 4 debe permitir que una tienda suba una imagen, obtenga items sugeridos, los revise y confirme antes de crear productos o afectar stock.

## Principios

- OCR nunca debe crear inventario final sin confirmacion humana.
- Todo dato de importacion pertenece a un `store_id`.
- La confirmacion debe ser transaccional: productos, stock inicial y auditoria se guardan juntos.
- El flujo debe funcionar en local aunque EasyOCR, Cloudinary, Redis o Celery no esten disponibles.
- Mantener el modelo simple para v1: imports, import items y confirmacion.
- Los contratos deben servir igual para web y mobile.

## Estado Actual

### Ya existe

- `POST /photos/upload` guarda en Cloudinary si hay credenciales.
- `POST /photos/ocr` intenta procesar la imagen y devuelve `raw_text`/`structured` en memoria.
- Hay puertos para OCR y photo storage.
- Productos ya soportan `sku`, `unit`, `cost_price`, `photo_url`, `qr_code`, `stock` y `min_stock`.
- Stock movements ya audita cambios de stock.
- `CreateProductUseCase` normaliza nombre y genera QR.

### Falta

- Persistir trabajos de importacion.
- Persistir items detectados por OCR.
- Editar/aprobar/rechazar items antes de confirmar.
- Confirmar importacion creando productos y movimientos `import`.
- Tests de tenant isolation para imports.
- Manejo consistente de estados y errores de OCR.

## Alcance Incluido

- Crear tablas `inventory_imports` e `inventory_import_items`.
- Agregar repositorio y use cases de importacion.
- Agregar router `inventory-imports`.
- Cambiar/acompanar `/photos/ocr` para crear un import persistido.
- Confirmar items revisados y crear productos.
- Registrar movimientos de stock por cada producto creado desde import.
- Tests unitarios/integracion para OCR persistido, revision y confirmacion.

## Fuera de Alcance

- OCR perfecto para cualquier formato de hoja.
- Matching avanzado contra productos existentes.
- Procesamiento masivo en background obligatorio.
- Importar archivos Excel/CSV.
- Generar imagenes QR o etiquetas.
- Devoluciones/anulaciones.

## Modelo de Datos

### `inventory_imports`

Campos:

- `id uuid primary key`
- `store_id uuid not null references stores(id)`
- `status text not null`
- `source_filename text`
- `source_content_type text`
- `source_photo_url text`
- `raw_text text`
- `error_message text`
- `items_count int not null default 0`
- `created_by uuid`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `confirmed_at timestamptz`

Estados permitidos:

- `pending`
- `processing`
- `needs_review`
- `confirmed`
- `failed`
- `cancelled`

Indices:

- `(store_id, created_at desc)`
- `(store_id, status)`

### `inventory_import_items`

Campos:

- `id uuid primary key`
- `import_id uuid not null references inventory_imports(id)`
- `store_id uuid not null references stores(id)`
- `status text not null`
- `row_number int not null`
- `name text not null`
- `category text`
- `sku text`
- `unit text not null default 'unidad'`
- `price numeric(10, 2) not null default 0`
- `cost_price numeric(10, 2)`
- `stock int not null default 0`
- `min_stock int not null default 5`
- `confidence numeric(5, 4)`
- `raw_data jsonb not null default '{}'`
- `product_id uuid references products(id)`
- `error_message text`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Estados permitidos:

- `draft`
- `approved`
- `rejected`
- `imported`
- `failed`

Indices:

- `(store_id, import_id)`
- `(import_id, status)`
- `(store_id, name)`

## API Propuesta

### Crear import desde foto

```http
POST /api/v1/inventory-imports/from-photo
Content-Type: multipart/form-data
```

Respuesta:

```json
{
  "id": "uuid",
  "status": "needs_review",
  "items_count": 12,
  "raw_text": "...",
  "items": []
}
```

Reglas:

- Leer archivo una sola vez.
- Subir foto si hay storage configurado; si no, continuar sin URL.
- Procesar OCR si el servicio esta disponible.
- Si OCR falla, guardar import `failed` con `error_message`.
- Nunca devolver datos de otra tienda.

### Listar imports

```http
GET /api/v1/inventory-imports?status=needs_review&limit=20&offset=0
```

Usar paginacion y ordenar por `created_at desc`.

### Obtener detalle

```http
GET /api/v1/inventory-imports/{import_id}
```

Debe incluir items y devolver 404 si pertenece a otra tienda.

### Actualizar items revisados

```http
PATCH /api/v1/inventory-imports/{import_id}/items/{item_id}
```

Payload:

```json
{
  "status": "approved",
  "name": "Arroz 1kg",
  "category": "Alimentos",
  "price": "12.50",
  "stock": 20,
  "min_stock": 5,
  "unit": "unidad",
  "sku": "ARR-1KG"
}
```

Reglas:

- Solo permitir cambios mientras import esta en `needs_review`.
- Validar `price >= 0`, `stock >= 0`, `min_stock >= 0`.
- `approved` requiere nombre valido.

### Confirmar import

```http
POST /api/v1/inventory-imports/{import_id}/confirm
```

Reglas:

- Confirmar solo items `approved`.
- Crear productos usando `CreateProductUseCase`.
- Registrar stock movement `import` por cada producto creado con stock inicial mayor a cero.
- Marcar items como `imported` y guardar `product_id`.
- Marcar import como `confirmed`.
- Operacion atomica: si falla un item aprobado, no debe quedar confirmacion parcial.

Respuesta:

```json
{
  "import_id": "uuid",
  "status": "confirmed",
  "created_products": 12,
  "failed_items": 0
}
```

### Cancelar import

```http
POST /api/v1/inventory-imports/{import_id}/cancel
```

Permitido para `pending`, `processing`, `needs_review` y `failed`. No permitido para `confirmed`.

## Parsing Inicial de OCR

Mantener un parser pragmatico para v1:

- Reusar `structured` si el proveedor OCR devuelve filas.
- Si solo hay `raw_text`, separar por lineas y crear drafts con baja confianza.
- Detectar numeros simples como precio/stock solo cuando sea obvio.
- Guardar siempre `raw_data` para auditoria y mejora futura.

Ejemplo de heuristica aceptable:

```text
Arroz 1kg 12.50 20
```

Produce:

- `name = "Arroz 1kg"`
- `price = 12.50`
- `stock = 20`
- `confidence = 0.6`

La precision avanzada queda para un sprint posterior.

## Use Cases

Crear:

- `CreateInventoryImportFromPhotoUseCase`
- `ListInventoryImportsUseCase`
- `GetInventoryImportUseCase`
- `UpdateInventoryImportItemUseCase`
- `ConfirmInventoryImportUseCase`
- `CancelInventoryImportUseCase`

Dependencias:

- `IInventoryImportRepository`
- `IOCRService`
- `IPhotoStorage`
- `IProductRepository`

Notas de DI:

- Exponer `get_inventory_import_repo`.
- Inyectar OCR/storage desde dependencias, con implementaciones no-op/fallback para dev.
- Evitar instanciar infraestructura directamente dentro del router.

## Repositorio

Interface minima:

- `create(import, items) -> InventoryImport`
- `list(store_id, status, limit, offset) -> tuple[list, total]`
- `get_by_id(store_id, import_id) -> InventoryImport | None`
- `update_item(store_id, import_id, item_id, patch) -> InventoryImportItem`
- `mark_confirmed(store_id, import_id, product_links) -> InventoryImport`
- `mark_failed(store_id, import_id, error_message) -> InventoryImport`
- `cancel(store_id, import_id) -> InventoryImport`

Implementacion SQLAlchemy:

- Consultas siempre con `store_id`.
- Usar `selectinload` para cargar items en detalle.
- Usar una sola transaccion para confirmacion.
- En Postgres, preferir `JSONB` para `raw_data`; mantener compatibilidad de tests SQLite usando el tipo JSON existente si aplica.

## Tests Requeridos

### Integracion

1. `test_create_import_from_photo_persists_needs_review`
   - Subir imagen fake con OCR mock.
   - Verificar import e items persistidos.

2. `test_get_import_is_store_scoped`
   - Import tienda A no visible para tienda B.

3. `test_update_import_item_validates_fields`
   - Rechazar precio negativo, stock negativo y nombre vacio.

4. `test_confirm_import_creates_products_and_stock_movements`
   - Aprobar items, confirmar y verificar productos + movimientos `import`.

5. `test_confirm_import_ignores_rejected_items`
   - Rechazados no crean productos.

6. `test_confirm_import_is_idempotency_guarded`
   - Confirmar dos veces devuelve conflicto o estado ya confirmado sin duplicar productos.

7. `test_cancel_confirmed_import_is_rejected`
   - No permitir cancelar import confirmado.

### Unitarios

8. Parser de OCR convierte lineas simples en drafts.
9. Parser maneja lineas vacias o ambiguas sin explotar.
10. Use case de confirmacion rechaza imports sin items aprobados.

## Validaciones Manuales

```powershell
cd apps/backend
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
docker compose up -d db
python -m alembic upgrade head
```

Probar en Swagger:

- `POST /api/v1/inventory-imports/from-photo`
- `GET /api/v1/inventory-imports`
- `GET /api/v1/inventory-imports/{id}`
- `PATCH /api/v1/inventory-imports/{id}/items/{item_id}`
- `POST /api/v1/inventory-imports/{id}/confirm`

## Criterios de Aceptacion

- OCR/importacion queda persistido y consultable.
- El usuario puede revisar items antes de confirmar.
- Confirmar crea productos tenant-scoped con QR generado.
- Confirmar registra stock movements `import`.
- Imports confirmados no se pueden modificar ni cancelar.
- No hay fugas multi-tenant.
- Tests nuevos pasan junto a los existentes.
- Alembic sube limpio en PostgreSQL.

## Riesgos y Decisiones

- **OCR impreciso:** se mitiga con estado `needs_review` y edicion manual.
- **Duplicados de productos:** para Sprint 4 crear productos nuevos; matching por SKU/nombre queda para Sprint 5.
- **Confirmacion parcial:** debe evitarse con transaccion unica.
- **Background jobs:** Redis/Celery puede integrarse despues; el contrato de imports ya soporta `pending/processing`.
- **Volumen:** para tiendas de hasta 1000 productos, imports paginados e indices por store/status son suficientes.

## Resultado Esperado

Al cerrar Sprint 4, la app puede transformar fotos de inventario en borradores revisables y luego en productos reales con auditoria de stock. Esto completa el valor principal de v1: inventario digital rapido, busqueda/QR, ventas, reportes basicos, sync inicial y carga asistida por foto.
