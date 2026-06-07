# Sprint 2: retirar Importaciones del backend API

Fecha: 2026-06-07

## Objetivo

Retirar del backend la API y la logica de **Importaciones por foto/OCR** para que el servidor ya no exponga ni mantenga endpoints, casos de uso, DTOs, repositorios o servicios OCR asociados al modulo eliminado del MVP web.

Este sprint mantiene intactas las migraciones historicas y las tablas existentes. La eliminacion fisica de `inventory_imports` e `inventory_import_items` queda para Sprint 3 con una migracion Alembic controlada.

## Estado heredado de Sprint 1

Sprint 1 completo:

- La web ya no muestra `Importaciones`.
- No existen rutas Next `/dashboard/imports` ni `/dashboard/imports/[importId]`.
- No existe proxy web `/api/inventory-imports/from-photo`.
- No quedan referencias web al modulo.
- Web y backend pasan sus verificaciones.

No se agregan pendientes de Sprint 1 a este sprint.

## Alcance

Incluido:

- Quitar `inventory_imports.router` del router FastAPI.
- Quitar `photos.router` como API generica del MVP.
- Eliminar API modules:
  - `apps/backend/src/presentation/api/v1/inventory_imports.py`
  - `apps/backend/src/presentation/api/v1/photos.py`
- Eliminar logica de importaciones:
  - DTOs
  - entidad de dominio
  - interfaz de repositorio
  - repositorio SQLAlchemy
  - casos de uso
  - parser OCR de importaciones
  - modelo SQLAlchemy de importaciones
- Eliminar OCR:
  - `IOCRService`
  - `EasyOCRService`
  - tareas Celery de OCR/fotos
  - extra `ai` del `pyproject.toml`
- Limpiar dependencias FastAPI sin uso:
  - `get_inventory_import_repo`
  - `get_ocr_service`
  - `get_photo_storage` si solo era usado por imports/photos.
- Ajustar tests backend:
  - eliminar tests de importaciones.
  - eliminar tests de `/photos/upload` y `/photos/ocr`.
  - eliminar asserts de permisos sobre confirmar importaciones.

Preservado:

- `cloudinary` como dependencia base.
- `python-multipart`.
- `IPhotoStorage`.
- `CloudinaryPhotoStorage`.
- `products.photo_url`.
- configuracion Cloudinary.

Fuera de alcance:

- Crear endpoint nuevo para fotos de productos.
- Crear importacion CSV.
- Eliminar tablas con migracion.
- Editar migraciones historicas aplicadas.

## Criterios de aceptacion

- `/api/v1/inventory-imports/*` ya no esta registrado.
- `/api/v1/photos/*` ya no esta registrado.
- No quedan imports Python hacia modulos eliminados.
- No quedan referencias backend a `EasyOCRService`, `IOCRService` ni `photo_tasks`.
- `Base.metadata.create_all` en tests no registra modelos de importaciones.
- Las migraciones historicas siguen presentes para trazabilidad hasta Sprint 3.
- Backend pasa:
  - `python -m pytest tests -q -p no:cacheprovider`
  - `python -m ruff check src tests --no-cache`
- Web sigue pasando al menos:
  - `corepack pnpm typecheck`

## Plan tecnico

1. Router:
   - Remover imports `inventory_imports` y `photos`.
   - Remover `include_router` de ambos.

2. Dependencias:
   - Remover import de `InventoryImportRepository`.
   - Remover factories de imports/OCR/photo upload generico que quedan sin rutas.
   - Mantener dependencias compartidas de auth, productos, ventas, reportes y caja.

3. Cola:
   - Remover `photo_tasks` de Celery include.
   - Remover route `photo_tasks.*`.

4. Archivos:
   - Eliminar modulos de importaciones.
   - Eliminar OCR.
   - Mantener Cloudinary/storage.

5. Tests:
   - Eliminar `test_inventory_imports.py`.
   - Eliminar `test_inventory_import_parser.py`.
   - Quitar test de permiso `cashier_cannot_confirm_inventory_import`.
   - Quitar test de `/photos/upload` y `/photos/ocr`.

6. Dependencias:
   - Eliminar extra opcional `ai`, porque OCR sale del MVP.
   - Mantener `cloudinary` y `python-multipart`.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Romper tests por metadata de modelos eliminados | Quitar imports de `models/__init__.py` y correr suite completa |
| Romper Celery por include inexistente | Limpiar `celery_app.py` junto con `photo_tasks.py` |
| Eliminar Cloudinary por accidente | Mantener `photo_storage.py`, `IPhotoStorage`, config y dependencia |
| Perder migracion historica | No tocar `006_create_inventory_imports.py` en Sprint 2 |
| Rutas removidas pero tests viejos esperando 200/403 | Eliminar o ajustar tests de imports/photos |

## Resultado esperado

Al final de este sprint el backend ya no ofrece importaciones por foto/OCR ni endpoints genericos de fotos. La capacidad de almacenamiento con Cloudinary queda disponible para construir fotos de productos en un sprint separado. La base de datos conserva las tablas hasta Sprint 3.
