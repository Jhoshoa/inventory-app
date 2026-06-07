# Sprint 3: eliminar tablas de Importaciones

Fecha: 2026-06-07

## Objetivo

Eliminar del schema las tablas dedicadas al modulo de **Importaciones por foto/OCR** mediante una migracion Alembic nueva y reversible, sin editar migraciones historicas ya aplicadas.

Este sprint cierra el retiro completo del modulo despues de:

- Sprint 1: retiro visible/frontend.
- Sprint 2: retiro backend/API/logica.

## Revision de Sprint 2

Sprint 2 quedo completo en codigo:

- No quedan routers `inventory_imports` ni `photos`.
- No quedan DTOs, entidades, repositorios, casos de uso ni servicios OCR activos.
- No quedan tests backend de Importaciones/OCR.
- Cloudinary, `IPhotoStorage`, `CloudinaryPhotoStorage`, `python-multipart` y `products.photo_url` siguen preservados.

Pendiente detectado para este sprint:

- Limpiar documentacion backend que todavia mencionaba endpoints `/photos/upload`, `/photos/ocr` y OCR como API actual.

## Alcance

Incluido:

- Crear migracion Alembic `015_drop_inventory_imports.py`.
- En `upgrade`, eliminar:
  - `inventory_import_items`
  - `inventory_imports`
  - indices asociados.
- En `downgrade`, recrear tablas e indices para reversibilidad.
- Hacer la migracion idempotente frente a entornos donde las tablas ya no existan.
- Actualizar documentacion backend obsoleta:
  - `apps/backend/README.md`
  - `apps/backend/examples/requests/README.md`
- Validar:
  - `python -m alembic upgrade head`
  - `python -m alembic downgrade 014`
  - `python -m alembic upgrade head`
  - `python -m pytest tests -q -p no:cacheprovider`
  - `python -m ruff check src tests --no-cache`

Fuera de alcance:

- Borrar o reescribir la migracion historica `006_create_inventory_imports.py`.
- Crear endpoints nuevos para fotos de productos.
- Crear importacion CSV.
- Modificar `stock_movements` historicos con `reason = inventory_import:*`.

## Consideraciones de base de datos

La migracion debe dropear tablas hijas antes que tablas padre:

1. `inventory_import_items`
2. `inventory_imports`

Antes de aplicar en un entorno con datos reales se debe:

- Hacer backup.
- Revisar si existen movimientos de stock con `reason LIKE 'inventory_import:%'`.
- Decidir si se necesita exportar historico de importaciones antes de eliminar tablas.

Para el MVP actual, se asume que no hay datos productivos que conservar.

## Criterios de aceptacion

- `alembic upgrade head` deja el schema sin `inventory_imports` ni `inventory_import_items`.
- `alembic downgrade 014` recrea el estado anterior a la migracion 015.
- `alembic upgrade head` vuelve a eliminar las tablas sin errores.
- Tests backend pasan completos.
- Ruff pasa.
- La documentacion backend ya no presenta `/photos` ni OCR como API vigente.
- Las referencias restantes a importaciones quedan limitadas a:
  - documentos historicos/de decision.
  - migracion historica `006_create_inventory_imports.py`.
  - nueva migracion `015_drop_inventory_imports.py`.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Perder datos historicos en entornos reales | Backup y conteo previo antes de aplicar en produccion |
| Fallar en SQLite local por indices inexistentes | Usar inspeccion de tablas/indices antes de dropear |
| Romper reversibilidad | Implementar `downgrade` completo con tablas e indices |
| Editar migracion historica aplicada | Crear migracion nueva con `down_revision = "014"` |
| Documentacion contradice API real | Actualizar README y ejemplos manuales |

## Resultado esperado

Al finalizar, el modulo de Importaciones queda retirado de UI, backend y base de datos. El proyecto queda listo para planificar una importacion CSV futura como capacidad nueva, separada del flujo OCR eliminado.
