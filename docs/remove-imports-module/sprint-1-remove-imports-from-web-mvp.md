# Sprint 1: retirar Importaciones del MVP web

Fecha: 2026-06-07

## Objetivo

Retirar el modulo visible de **Importaciones** del MVP web para que ningun usuario pueda navegar, subir fotos ni revisar imports desde la aplicacion. Este sprint elimina la superficie frontend y el proxy Next.js asociado, sin tocar todavia backend, base de datos, Cloudinary ni almacenamiento de fotos de productos.

## Alcance

Incluido:

- Quitar `Importaciones` del sidebar y drawer mobile.
- Eliminar rutas web:
  - `/dashboard/imports`
  - `/dashboard/imports/[importId]`
- Eliminar el route handler web:
  - `/api/inventory-imports/from-photo`
- Eliminar feature frontend:
  - `apps/web/src/features/imports`
- Eliminar helper de proxy:
  - `apps/web/src/lib/api/import-upload.ts`
- Eliminar permisos frontend especificos de importaciones.
- Ajustar pruebas unitarias/e2e que referencian Importaciones.
- Verificar `test`, `typecheck`, `lint`, `build` y `test:e2e` de web.

Fuera de alcance:

- Backend FastAPI de `inventory_imports`.
- Endpoints `/photos`.
- Cloudinary y `IPhotoStorage`.
- OCR backend.
- Migraciones y tablas `inventory_imports` / `inventory_import_items`.
- Importacion CSV futura.

## Criterios de aceptacion

- El menu principal no muestra `Importaciones`.
- `/dashboard/imports` y `/dashboard/imports/*` caen en la pantalla generica de seccion no encontrada o dejan de existir como rutas especificas.
- No queda bundle/ruta Next para `/api/inventory-imports/from-photo`.
- No quedan imports TypeScript hacia `@/features/imports` ni `@/lib/api/import-upload`.
- No quedan permisos frontend de importaciones sin uso.
- Los e2e no esperan rutas de Importaciones.
- Web pasa:
  - `corepack pnpm test`
  - `corepack pnpm typecheck`
  - `corepack pnpm lint`
  - `corepack pnpm build`
  - `corepack pnpm test:e2e`

## Plan tecnico

1. Actualizar navegacion:
   - Remover `FileImage`.
   - Remover `canCreateImport`.
   - Remover item `/dashboard/imports`.

2. Limpiar permisos frontend:
   - Eliminar `canCreateImport`.
   - Eliminar `canReviewImport`.
   - Eliminar `canConfirmImport`.
   - Eliminar `canCancelImport`.
   - Actualizar tests de permisos.

3. Eliminar rutas y feature:
   - Borrar `apps/web/app/(app)/dashboard/imports`.
   - Borrar `apps/web/app/api/inventory-imports/from-photo/route.ts`.
   - Borrar `apps/web/src/features/imports`.
   - Borrar `apps/web/src/lib/api/import-upload.ts`.

4. Ajustar e2e:
   - Eliminar `apps/web/e2e/imports.spec.ts`.
   - Quitar `/dashboard/imports` de `smoke.spec.ts`.
   - Quitar `/dashboard/imports` de `a11y.spec.ts`.
   - Actualizar tests de shell/navegacion que esperen el item.

5. Verificar referencias:
   - Buscar `imports`, `inventory-imports`, `Import Image`, `Importaciones`, `canCreateImport`, `canConfirmImport`, `canReviewImport`, `canCancelImport`.
   - Mantener referencias historicas en docs fuera del alcance si son documentos de planificacion.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| E2E roto por rutas eliminadas | Actualizar smoke/a11y y borrar spec dedicado |
| Imports TypeScript colgantes | Ejecutar `rg` y `pnpm typecheck` |
| Navegacion con icon/import sin uso | Limpiar `navigation.ts` y tests |
| Build Next conservando route handler eliminado | Ejecutar `pnpm build` y revisar lista de rutas |
| Confundir retiro web con retiro backend | No modificar backend en Sprint 1 |

## Resultado esperado

Al final de este sprint, Importaciones queda fuera del MVP visible. El backend y la base de datos pueden seguir existiendo temporalmente como deuda controlada para los sprints 2 y 3, pero ningun usuario web tendra entrada al flujo de fotos/OCR.
