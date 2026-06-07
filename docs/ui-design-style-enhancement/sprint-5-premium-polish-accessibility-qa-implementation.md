# Sprint 5 premium: pulido global, accesibilidad y QA visual

Fecha: 2026-06-03

Estado: implementado para el alcance inicial

## Objetivo

Cerrar la migracion premium con una pasada de calidad global sobre superficies que quedaron fuera de los sprints principales, validando que la app sea consistente, accesible y robusta en mobile, tablet y desktop.

Sprint 5 no cambia contratos de API, permisos, rutas, server actions ni comportamiento de negocio. El foco es pulido visual, accesibilidad y verificacion.

## Resultado de implementacion

Implementado el 2026-06-03 para el alcance inicial de pulido global.

- Se migraron `app/layout.tsx` y `app/global-error.tsx` a tokens semanticos.
- Se migro el overlay del drawer mobile a tokens semanticos.
- Se creo `AuthShell` reusable para pantallas publicas de autenticacion.
- Se migraron `/login` y `/register` a superficies premium.
- Se actualizo `LoginForm` para usar `FieldError` en errores de campos.
- Se agregaron tests para `AuthShell` y se reforzaron tests de login.
- Se mantuvo Importaciones/OCR fuera de alcance.
- Se dejo `ProductLabelCard` como excepcion controlada por salida impresa.

Verificacion ejecutada:

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`

Resultado:

- 45 archivos de test pasaron.
- 137 tests pasaron.
- Typecheck, lint y build pasaron.

## Skills a aplicar

- `next-best-practices`: preservar Server Components, mantener convenciones App Router, evitar cambios innecesarios de runtime y no mover data fetching a cliente.
- `vercel-react-best-practices`: mantener componentes pequenos, evitar duplicacion visual, no introducir renders innecesarios y conservar imports concretos.

## Alcance

### Pulido global

- Migrar `app/layout.tsx` y `app/global-error.tsx` a tokens semanticos.
- Revisar `not-found` global y `dashboard/not-found` para estados consistentes.
- Ajustar overlays globales pendientes, especialmente el drawer mobile.

### Auth premium

- Migrar `/login` y `/register` a superficies premium.
- Crear un wrapper reusable para pantallas auth si evita duplicacion.
- Mantener el flujo de login actual sin cambiar endpoints ni redirecciones.
- Usar `FieldError`, `Alert`, `Input`, `Label` y `Button` existentes.

### Accesibilidad

- Verificar foco visible en controles interactivos.
- Validar navegacion por teclado en auth y drawer mobile.
- Mantener nombres accesibles en acciones con iconos.
- Revisar roles de error, empty y forbidden states.

### QA visual

- Validar que no haya overflow horizontal del documento.
- Revisar textos largos, datos extremos y estados vacios.
- Documentar excepciones visuales controladas.

## Fuera de alcance

- Mejorar o redisenar Importaciones/OCR.
- Implementar importacion CSV.
- Cambiar flujo de autenticacion o registrar tiendas realmente.
- Redisenar etiquetas de impresion cuando el estilo directo sea necesario para salida impresa.
- Agregar nuevas librerias UI.

## Excepciones controladas

- `ProductLabelCard` puede conservar estilos directos orientados a impresion si son necesarios para legibilidad fisica y preview de etiquetas.
- Importaciones/OCR queda fuera por decision de producto.

## Deuda restante

- Ejecutar QA visual con screenshots por viewport.
- Documentar cualquier ajuste visual encontrado en mobile/tablet/desktop.
- Planificar importacion CSV como sprint separado si se decide construir esa funcionalidad.

## Orden recomendado

1. Crear documento de Sprint 5 y actualizar roadmap.
2. Migrar layout/global error/not-found a tokens premium.
3. Migrar auth con componente reusable.
4. Ajustar overlay mobile pendiente.
5. Agregar o actualizar tests relevantes.
6. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build`.
7. Documentar resultado y deuda restante.

## Criterios de aceptacion

- Auth, layout global y errores globales usan tokens semanticos.
- No quedan estilos directos MVP relevantes fuera de Importaciones/OCR, auth ya migrado y excepciones de impresion.
- El drawer mobile conserva cierre por click, Escape y foco controlado.
- Los formularios auth preservan validacion y feedback accesible.
- Tests relevantes pasan.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## Tests esperados

- Auth shell: render de titulo, descripcion, contenido y link secundario.
- Login: validaciones, errores y uso de `FieldError`.
- App shell/drawer: apertura, cierre, foco y overlay.
- Estados globales: smoke tests donde sea razonable.

## Riesgos

- `global-error.tsx` es Client Component; evitar dependencias server-only.
- Las paginas auth son rutas publicas; no introducir dependencias de sesion.
- Cambios visuales globales pueden afectar todas las rutas.

## Mitigaciones

- Usar solo componentes UI existentes y tokens ya definidos.
- Mantener cambios pequenos y verificables.
- Correr test completo, typecheck, lint y build antes de cerrar.
