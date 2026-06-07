# Analisis para retirar el modulo de Importaciones del MVP

Fecha: 2026-06-06

## Resumen ejecutivo

Retirar el modulo de **Importaciones** del primer MVP es factible y recomendable si la carga asistida por fotos/OCR no es una prioridad inmediata. La complejidad no esta solo en la pagina web: el modulo ya tiene rutas frontend, proxy API en Next.js, componentes, permisos, endpoints FastAPI, casos de uso, entidades de dominio, repositorios, modelos SQLAlchemy, pruebas y dos tablas propias en base de datos.

La forma mas prudente para el MVP es retirarlo en dos niveles:

1. **Retiro funcional para MVP:** quitar navegacion, paginas, proxy web y endpoints backend para que el usuario no pueda usar el flujo.
2. **Limpieza estructural posterior o en el mismo sprint si no hay datos reales:** eliminar codigo de importaciones/OCR, pruebas y tablas `inventory_imports` / `inventory_import_items`.

Si la base de datos actual no tiene datos productivos, el borrado completo es de complejidad media-baja. Si ya hay datos reales o entornos compartidos, la parte de base de datos requiere migracion controlada y backup.

## Decision de producto recomendada

Para el primer MVP, sacar este modulo reduce alcance y riesgo:

- Evita depender de OCR, almacenamiento de imagenes y revision humana.
- Evita explicar un flujo que puede fallar por calidad de imagen, OCR o datos ambiguos.
- Mantiene el MVP enfocado en productos, inventario, POS, ventas, reportes y exportaciones.
- Encaja con el flujo propuesto: usar Claude Code/Codex para convertir fotos externas a CSV y, mas adelante, agregar importacion por CSV.

La siguiente capacidad deberia ser **importacion CSV**, no OCR por foto:

- `POST /imports/products.csv` o endpoint equivalente.
- Validacion y preview de filas.
- Confirmacion manual.
- Sin almacenamiento de imagenes ni servicios AI/OCR dentro de la app.

## Alcance detectado

### Frontend web

Archivos principales:

- `apps/web/app/(app)/dashboard/imports/page.tsx`
- `apps/web/app/(app)/dashboard/imports/[importId]/page.tsx`
- `apps/web/app/(app)/dashboard/imports/loading.tsx`
- `apps/web/app/api/inventory-imports/from-photo/route.ts`
- `apps/web/src/features/imports/`
- `apps/web/src/lib/api/import-upload.ts`
- `apps/web/src/components/layout/navigation.ts`
- `apps/web/src/lib/auth/permissions.ts`
- Pruebas relacionadas:
  - `apps/web/e2e/imports.spec.ts`
  - referencias en `apps/web/e2e/smoke.spec.ts`
  - referencias en `apps/web/e2e/a11y.spec.ts`
  - tests unitarios bajo `apps/web/src/features/imports/**/*.test.tsx`
  - referencias en `apps/web/src/lib/auth/permissions.test.ts`

Impacto:

- Quitar el item `Importaciones` del sidebar.
- Eliminar rutas `/dashboard/imports` y `/dashboard/imports/[importId]`.
- Eliminar el proxy `/api/inventory-imports/from-photo`.
- Eliminar la feature `src/features/imports`.
- Ajustar pruebas e2e y unitarias para que no esperen esa pagina.
- Quitar permisos frontend `canCreateImport`, `canReviewImport`, `canConfirmImport`, `canCancelImport` si no quedan usos.

Complejidad frontend estimada: **baja-media**.

### Backend

Archivos principales:

- `apps/backend/src/presentation/api/v1/inventory_imports.py`
- `apps/backend/src/presentation/api/v1/photos.py`
- `apps/backend/src/presentation/api/v1/router.py`
- `apps/backend/src/presentation/dependencies.py`
- `apps/backend/src/application/dto/inventory_import_dto.py`
- `apps/backend/src/application/dto/photo_dto.py`
- `apps/backend/src/application/use_cases/inventory_imports/`
- `apps/backend/src/application/use_cases/photos/`
- `apps/backend/src/application/ports/ocr_service.py`
- `apps/backend/src/application/ports/photo_storage.py`
- `apps/backend/src/domain/entities/inventory_import.py`
- `apps/backend/src/domain/repositories/inventory_import_repository.py`
- `apps/backend/src/infrastructure/database/repositories/inventory_import_repository.py`
- `apps/backend/src/infrastructure/database/models/inventory_import_model.py`
- `apps/backend/src/infrastructure/database/models/__init__.py`
- `apps/backend/src/infrastructure/services/ocr/easy_ocr.py`
- `apps/backend/src/infrastructure/services/cloudinary/photo_storage.py`
- `apps/backend/src/infrastructure/services/queue/tasks/photo_tasks.py`

Pruebas relacionadas:

- `apps/backend/tests/integration/test_inventory_imports.py`
- referencias de permisos en `apps/backend/tests/integration/test_auth_users_permissions.py`
- endpoints de fotos en `apps/backend/tests/integration/test_api.py`
- parser en `apps/backend/tests/unit/application/test_inventory_import_parser.py`

Impacto:

- Quitar `inventory_imports.router` del router principal.
- Decidir si tambien se elimina `photos.router`. Para el MVP, si no hay otro uso real de fotos/OCR, conviene eliminarlo o deshabilitarlo para no dejar endpoints muertos.
- Quitar dependencias `get_inventory_import_repo`, `get_ocr_service`, `get_photo_storage` si quedan sin uso.
- Eliminar casos de uso, DTOs, entidad, repositorio y modelos de importaciones.
- Quitar o posponer dependencias opcionales de AI/OCR si no tienen otro uso.
- Mantener `cloudinary`, `python-multipart`, la configuracion Cloudinary y el servicio/puerto de storage si se implementaran fotos de productos.
- El extra `ai` de `pyproject.toml` queda innecesario para el MVP si se retira OCR.

Complejidad backend estimada: **media**.

### Base de datos

Tablas dedicadas creadas por `apps/backend/src/infrastructure/database/alembic/versions/006_create_inventory_imports.py`:

- `inventory_imports`
- `inventory_import_items`

Indices dedicados:

- `ix_inventory_imports_store_created_at`
- `ix_inventory_imports_store_status`
- `ix_inventory_import_items_store_import`
- `ix_inventory_import_items_import_status`
- `ix_inventory_import_items_store_name`

Relaciones:

- `inventory_imports.store_id -> stores.id`
- `inventory_import_items.import_id -> inventory_imports.id`
- `inventory_import_items.store_id -> stores.id`
- `inventory_import_items.product_id -> products.id`

Impacto:

- Si no hay datos productivos, se puede crear una migracion nueva que elimine indices y tablas.
- Si hay datos productivos, se debe hacer backup antes de dropear.
- No conviene editar una migracion historica ya aplicada en entornos existentes. Lo correcto es crear una nueva migracion, por ejemplo `015_drop_inventory_imports.py`.
- Si el proyecto todavia no tiene una base compartida y se permite rehacer schema desde cero, tambien se podria modificar la cadena historica, pero eso es mas riesgoso para colaboracion.

Complejidad base de datos estimada: **baja si no hay datos, media si hay entornos existentes**.

## Dependencias y efectos colaterales

### Stock movements

El caso de uso `ConfirmInventoryImportUseCase` crea productos y luego llama `update_stock(..., movement_type="import", reason="inventory_import:<id>")`.

Al retirar el modulo:

- Ya no se generaran movimientos de stock con `movement_type="import"` desde este flujo.
- Puede quedar historico en `stock_movements` con razon `inventory_import:<id>` si ya se confirmaron importaciones.
- Si se eliminan las tablas de importaciones, esos movimientos historicos quedarian sin detalle navegable. No rompe integridad si no hay FK, pero reduce trazabilidad.

Mitigacion:

- Antes de borrar tablas en produccion, revisar si existen movimientos con `reason LIKE 'inventory_import:%'`.
- Si existen y se quiere conservar trazabilidad, exportar datos o mantener tablas archivadas hasta que deje de importar.

### Fotos, Cloudinary y OCR

Hay dos conceptos mezclados:

- Modulo de importacion desde foto.
- Upload/storage de imagenes con Cloudinary.
- OCR sobre fotos.
- Endpoints genericos `/photos/upload` y `/photos/ocr`.

Como Cloudinary se usara para fotos de productos, **no debe eliminarse Cloudinary ni toda la infraestructura de storage**. Lo que si debe retirarse del MVP es el flujo de importacion por foto y OCR.

Decision recomendada:

- Mantener `CloudinaryPhotoStorage` o renombrarlo a un servicio mas generico si se quiere usar para productos.
- Mantener `IPhotoStorage` si sirve para abstraer el almacenamiento de imagenes de producto.
- Mantener `cloudinary` en `pyproject.toml`.
- Mantener `python-multipart`, porque tambien sera necesario para subir imagenes de producto y luego CSV.
- Retirar `IOCRService`, `EasyOCRService`, el extra `ai` y los casos de uso OCR si no quedan usos.
- Retirar o redisenar `/photos/upload`: no deberia quedar como endpoint generico sin contrato de producto. Para fotos de producto conviene crear un endpoint especifico, por ejemplo `POST /products/{product_id}/photo`, o permitir `photo_url` despues de subir a un endpoint dedicado.
- Retirar `/photos/ocr`.

Mantener endpoints invisibles puede aumentar superficie de mantenimiento y seguridad sin valor de producto.

Mitigacion:

- Retirar rutas del router principal.
- Mantener el codigo de Cloudinary/storage porque sera reutilizado para productos.
- Eliminar o desregistrar solo el codigo OCR y las rutas de importacion por foto.
- Si se deja algun codigo OCR sin rutas, marcarlo como futuro y no incluirlo en el MVP.

### Permisos

Actualmente existen permisos frontend para importaciones:

- `canCreateImport`
- `canReviewImport`
- `canConfirmImport`
- `canCancelImport`

Backend usa `require_owner` en endpoints de importaciones.

Mitigacion:

- Al quitar el modulo, eliminar permisos frontend sin uso.
- Quitar tests que validan restricciones de importaciones.
- No hace falta crear permisos nuevos hasta que exista importacion CSV.

### Documentacion existente

Hay varios documentos que mencionan importaciones, OCR o fotos como parte de planes anteriores:

- `docs/backend-enhancement/sprint-4-assisted-import-plan.md`
- `docs/frontend-web/sprint-5-assisted-import-ocr-plan.md`
- documentos de roles y UI que referencian `/dashboard/imports`.

Mitigacion:

- No es necesario reescribir todo el historico.
- Agregar una nota de cambio de alcance en la documentacion activa del MVP.
- Este documento puede servir como referencia de decision.

## Plan de retiro recomendado

### Fase 1: retirar del MVP visible

Objetivo: que el producto ya no exponga Importaciones.

Pasos:

1. Quitar `Importaciones` de `apps/web/src/components/layout/navigation.ts`.
2. Eliminar rutas web `/dashboard/imports` y `/dashboard/imports/[importId]`.
3. Eliminar `apps/web/app/api/inventory-imports/from-photo/route.ts`.
4. Quitar `apps/web/src/features/imports/` y `apps/web/src/lib/api/import-upload.ts`.
5. Ajustar e2e `smoke.spec.ts` y `a11y.spec.ts`; eliminar `imports.spec.ts`.
6. Quitar permisos frontend de importaciones y sus asserts en tests.

Resultado: no hay UI ni proxy web para subir fotos.

### Fase 2: retirar backend API y logica

Objetivo: que la API ya no exponga ni mantenga importaciones por foto.

Pasos:

1. Quitar imports y `include_router` de `inventory_imports` en `apps/backend/src/presentation/api/v1/router.py`.
2. Retirar `photos.router` como API generica del MVP, o dividirlo para conservar solo upload de fotos de producto cuando esa funcionalidad exista.
3. Eliminar `apps/backend/src/presentation/api/v1/inventory_imports.py`.
4. Eliminar DTOs, use cases, entidad, repositorios y modelos de importaciones.
5. Quitar `InventoryImportModel` e `InventoryImportItemModel` de `models/__init__.py`.
6. Limpiar `presentation/dependencies.py`.
7. Eliminar pruebas de importaciones y ajustar pruebas de permisos/API.
8. Eliminar DTOs/use cases/ports/servicios relacionados con OCR. Mantener los relacionados con Cloudinary/storage para fotos de productos.

Resultado: backend sin endpoints ni capas internas de importaciones.

### Fase 3: migracion de base de datos

Objetivo: eliminar tablas dedicadas.

Pasos:

1. Crear nueva migracion Alembic, por ejemplo `015_drop_inventory_imports.py`.
2. En `upgrade`, dropear indices y tablas en orden:
   - indices de `inventory_import_items`
   - `inventory_import_items`
   - indices de `inventory_imports`
   - `inventory_imports`
3. En `downgrade`, recrear tablas si se necesita reversibilidad.
4. Ejecutar tests de migracion o al menos `alembic upgrade head` en una DB local limpia.
5. Para entornos con datos, hacer backup antes de aplicar.

Resultado: schema sin tablas de importaciones.

## Riesgos y mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigacion |
| --- | --- | --- | --- |
| Borrar datos historicos de importaciones | Medio/alto si ya hay usuarios | Baja si aun no hay produccion | Backup, conteo previo y migracion controlada |
| Dejar rutas rotas en navegacion o tests e2e | Medio | Media | Eliminar rutas y actualizar smoke/a11y |
| Dejar imports Python/TS rotos | Medio | Media | Ejecutar typecheck web, pytest backend y ruff |
| Perder trazabilidad de stock creado por importaciones ya confirmadas | Medio | Baja/media | Revisar `stock_movements.reason` antes de dropear tablas |
| Eliminar Cloudinary necesario para fotos de productos | Medio | Media | Separar storage de OCR; mantener Cloudinary y eliminar solo importaciones/OCR |
| Eliminar OCR/fotos que podrian servir en el futuro | Bajo | Media | Mantener decision documentada; reintroducir OCR desde branch o historial cuando haga falta |
| Confundir importacion CSV futura con importacion por foto | Medio | Media | Nombrar futuro modulo como `csv-imports` o `bulk-imports`, no reutilizar ciegamente el flujo OCR |
| Romper dependencias opcionales de build por cambios en `pyproject.toml` | Bajo | Baja | Quitar dependencias AI solo despues de confirmar que no hay otros usos |

## Complejidad total

Estimacion si se retira por completo:

- Frontend: **4 a 8 horas**.
- Backend: **6 a 12 horas**.
- Base de datos/migraciones: **2 a 4 horas** si no hay datos productivos; mas si hay que preservar historico.
- Pruebas y QA: **3 a 6 horas**.

Total razonable: **1 a 2 dias de trabajo** para dejarlo limpio y verificado.

Si solo se quiere ocultar/deshabilitar para el MVP sin borrar internals:

- Frontend visible: **1 a 3 horas**.
- Backend: opcional, **1 hora** para no registrar routers.
- DB: sin cambios.

Total razonable: **medio dia**, pero deja deuda tecnica.

## Recomendacion final

Para el MVP, la mejor opcion es **retirarlo por completo de UI y API**, y crear migracion para eliminar las tablas si no hay datos reales que conservar. Esto simplifica el producto y baja el riesgo de mantener un flujo con OCR/fotos que no aporta suficiente valor frente al proceso externo con Claude Code/Codex y exportacion CSV.

La importacion futura deberia redisenarse como flujo CSV:

- Subir CSV.
- Validar columnas.
- Mostrar preview editable.
- Confirmar cambios.
- Crear productos o ajustar inventario con trazabilidad clara.

No conviene adaptar el modulo actual de fotos como base directa sin refactor, porque su dominio, textos, endpoints y persistencia estan centrados en imagen/OCR.
