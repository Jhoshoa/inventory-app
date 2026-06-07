# Backlog final MVP 1: UI profesional para tiendas

Fecha: 2026-06-07

## Objetivo

Convertir el cierre visual del MVP 1 en una lista ejecutable de sprints pequeños. La app ya tiene una base funcional y una fundacion premium aplicada; este backlog se enfoca en elevar la experiencia para uso diario por muchas tiendas, sin agregar features grandes ni cambiar logica de negocio.

La meta es que la UI se sienta:

- profesional;
- clara para operacion diaria;
- estable en mobile, tablet y desktop;
- consistente en tablas, acciones, estados y flujos criticos;
- lista para uso repetido por cajeros y owners.

## Principios

- Priorizar claridad operativa sobre decoracion.
- Mantener densidad de informacion, especialmente en desktop.
- Evitar cambios de negocio dentro de sprints visuales.
- Validar cada sprint con typecheck, lint, tests, e2e y build cuando toque frontend.
- No reintroducir el modulo de Importaciones por foto/OCR.
- Tratar futuras cargas CSV y fotos de producto como features separadas.

## Estado actual

Ya completado:

- Sistema visual premium base.
- Layout global con sidebar, mobile drawer, header y contenedor principal.
- `PageHeader`, `PageSection`, breadcrumbs y toolbars responsivos.
- Pantallas criticas migradas visualmente.
- Retiro completo del modulo de Importaciones por foto/OCR.
- Consistencia de wrappers principales con `PageSection`.

Pendiente principal:

- QA visual sistematico por viewport.
- Tablas mas operativas para uso intensivo.
- POS mas cercano a una caja registradora real.
- Empty/loading/error states mas accionables.
- Ajustes como centro administrativo mas profesional.
- Mejor responsive de tablas en mobile.
- Feedback post-accion mas consistente.
- Identidad visual sutil de tienda/producto.

## Sprints propuestos

### Sprint 1: QA visual y baseline de screenshots

Prioridad: Alta

Objetivo:

Crear una linea base visual real para cerrar regresiones y revisar la app como producto, no solo por tests funcionales.

Alcance:

- Capturar screenshots por viewport.
- Revisar solapes, overflow horizontal, cortes de texto y jerarquia visual.
- Documentar hallazgos por ruta.
- Corregir solo issues pequenos encontrados durante la revision.

Viewports minimos:

```text
375 x 812
430 x 932
768 x 1024
1024 x 768
1440 x 900
```

Rutas minimas:

```text
/dashboard
/dashboard/pos
/dashboard/products
/dashboard/products/labels
/dashboard/sales
/dashboard/reports
/dashboard/settings
```

Criterios de aceptacion:

- Existe documento de QA con hallazgos y screenshots o evidencia equivalente.
- No hay overflow horizontal del documento en rutas principales.
- No hay textos o controles solapados.
- Se identifican mejoras restantes para sprints posteriores.

Validacion:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

### Sprint 2: Tablas operativas premium

Prioridad: Alta

Objetivo:

Mejorar la lectura y uso intensivo de tablas para tiendas con muchos productos, ventas y movimientos.

Alcance:

- Refinar `Table` como primitive compartido.
- Alinear columnas numericas a la derecha donde aplique.
- Mejorar densidad visual de filas en desktop.
- Hacer encabezados mas claros y consistentes.
- Mejorar estados visuales de filas:
  - stock bajo;
  - sin stock;
  - venta anulada;
  - movimientos sensibles.
- Revisar acciones compactas con iconos y tooltip.

Pantallas objetivo:

- Productos.
- Ventas.
- Movimientos de stock.
- Movimientos de caja.
- Cierres diarios.
- Dashboard tables.

Fuera de alcance:

- Convertir todas las tablas a cards mobile.
- Cambiar paginacion backend.
- Agregar sorting backend nuevo.

Criterios de aceptacion:

- Las tablas se ven consistentes entre pantallas.
- Numeros, montos y cantidades son faciles de escanear.
- Acciones no rompen mobile.
- No se pierde informacion critica.

### Sprint 3: POS operativo premium

Prioridad: Alta

Objetivo:

Hacer que el POS se sienta mas como una caja registradora profesional y menos como un formulario general.

Alcance:

- Dar mas prominencia al total del carrito.
- Mejorar estados de busqueda y escaneo.
- Refinar el carrito sticky en desktop/tablet.
- Mejorar foco automatico despues de agregar producto.
- Destacar checkout cuando el carrito tiene items.
- Revisar empty state inicial del POS.
- Mejorar feedback cuando cambia el stock.

Pantallas/componentes:

- `/dashboard/pos`
- `PosWorkspace`
- `PosProductSearch`
- `PosProductResults`
- `PosCart`
- `PosCheckoutPanel`

Fuera de alcance:

- Atajos complejos de teclado.
- Integracion con hardware de scanner.
- Cambios de backend en ventas.

Criterios de aceptacion:

- El flujo vender producto es claro en desktop y mobile.
- El total se identifica rapidamente.
- El foco vuelve al buscador despues de acciones clave.
- El checkout comunica estado y disponibilidad.

### Sprint 4: Estados vacios, loading y errores accionables

Prioridad: Alta

Objetivo:

Hacer que cada estado vacio o error guie al usuario hacia la siguiente accion operativa.

Alcance:

- Revisar `EmptyState`.
- Hacer variantes o props para acciones reales.
- Evitar botones disabled como accion principal cuando no aportan.
- Mejorar loading states de rutas principales.
- Revisar errores de conexion/backend.

Casos objetivo:

- Productos vacios: accion para crear producto.
- Ventas vacias: accion para ir a POS.
- Reportes vacios: cambiar rango o registrar ventas.
- Caja cerrada: abrir jornada si el rol lo permite.
- Categorias vacias: crear categoria.

Criterios de aceptacion:

- Cada empty state comunica causa y siguiente paso.
- Las acciones respetan permisos.
- No hay CTAs deshabilitados que parezcan bugs.
- Los errores mantienen tono profesional.

### Sprint 5: Ajustes como centro administrativo

Prioridad: Alta

Objetivo:

Elevar `/dashboard/settings` para que se sienta como una pantalla administrativa real de tienda.

Alcance:

- Reorganizar secciones de ajustes:
  - tienda;
  - usuario actual;
  - permisos;
  - categorias;
  - operacion diaria;
  - usuarios futuro.
- Reemplazar "Gestion de usuarios pendiente" por un bloque profesional de "Proximamente" o "Planificado".
- Mejorar jerarquia visual de permisos y categorias.
- Revisar acciones owner/cashier.

Fuera de alcance:

- Implementar invitaciones reales.
- Cambiar roles.
- Crear configuracion avanzada de tienda.

Criterios de aceptacion:

- Settings ya no parece una pantalla temporal.
- Las secciones se escanean rapido.
- Las funciones futuras no degradan la percepcion del MVP.

### Sprint 6: Mobile avanzado para tablas criticas

Prioridad: Media

Objetivo:

Mejorar la experiencia mobile donde el scroll horizontal de tablas sea insuficiente para operacion real.

Alcance:

- Evaluar tablas que deben convertirse a cards en mobile.
- Crear patron reusable si aplica.
- Mantener tabla desktop para densidad.

Candidatas:

- Productos.
- Ventas.
- Movimientos de caja.
- Cierres diarios.

Criterios de aceptacion:

- Mobile permite leer y actuar sin depender siempre de scroll horizontal.
- Desktop mantiene tabla densa.
- No se duplica logica de datos innecesariamente.

### Sprint 7: Feedback post-accion

Prioridad: Media

Objetivo:

Unificar el feedback despues de operaciones frecuentes.

Alcance:

- Definir patron de success/error post-accion.
- Revisar si conviene toast, banner o mensajes inline por pantalla.
- Aplicar en:
  - crear/editar producto;
  - ajustar stock;
  - confirmar venta;
  - anular venta;
  - abrir/cerrar caja;
  - crear/desactivar categoria.

Fuera de alcance:

- Sistema global complejo de notificaciones.
- Persistencia de notificaciones.

Criterios de aceptacion:

- El usuario entiende cuando una accion tuvo exito.
- Los errores se muestran cerca del contexto.
- El patron es consistente.

### Sprint 8: Identidad visual y branding sutil

Prioridad: Baja

Objetivo:

Hacer que la app se sienta menos generica sin convertirla en una landing page.

Alcance:

- Mejor tratamiento del nombre de tienda.
- Estado de jornada visible en header o dashboard.
- Marca/logo simple si existe.
- Refinar sidebar/header con identidad sutil.

Fuera de alcance:

- Rediseño completo de marca.
- Gradientes decorativos.
- Ilustraciones grandes.

Criterios de aceptacion:

- La app mantiene tono operativo.
- La identidad mejora percepcion sin distraer.
- No aumenta ruido visual.

### Sprint 9: Datos extremos y hardening visual

Prioridad: Media

Objetivo:

Validar la UI con datos realistas y extremos antes de cerrar MVP 1.

Casos a probar:

- Nombres de producto largos.
- Categorias largas.
- Montos grandes.
- Muchos productos en tabla.
- Productos sin SKU/codigo.
- Productos sin stock.
- Ventas anuladas.
- Reportes sin datos.
- Reportes con muchos datos.

Criterios de aceptacion:

- No hay overflow accidental.
- Los textos largos se cortan o envuelven profesionalmente.
- Los montos se mantienen legibles.
- La UI sigue siendo escaneable.

## Orden recomendado

1. Sprint 1: QA visual y baseline de screenshots.
2. Sprint 2: Tablas operativas premium.
3. Sprint 3: POS operativo premium.
4. Sprint 4: Estados accionables.
5. Sprint 5: Settings administrativo.
6. Sprint 9: Datos extremos.
7. Sprint 6: Mobile avanzado para tablas.
8. Sprint 7: Feedback post-accion.
9. Sprint 8: Branding sutil.

Razon:

- Primero se necesita evidencia visual.
- Luego se mejora lo mas usado por tiendas: tablas y POS.
- Despues se cierran estados, settings y datos extremos.
- Los sprints de feedback y branding pueden esperar si el MVP necesita salir antes.

## Definicion de listo por sprint

Cada sprint debe cerrar con:

- documento breve de implementacion si cambia alcance relevante;
- cambios acotados a frontend salvo necesidad justificada;
- `corepack pnpm typecheck`;
- `corepack pnpm lint`;
- `corepack pnpm test`;
- `corepack pnpm test:e2e` cuando toque rutas o interacciones;
- `corepack pnpm build`;
- resumen de riesgos restantes.

## Fuera del backlog visual MVP 1

Estos temas son importantes, pero deben planificarse como features separadas:

- Foto de producto con Cloudinary.
- Importacion CSV de productos/inventario.
- Invitaciones y gestion completa de usuarios.
- Configuracion avanzada de tienda.
- Integraciones con hardware de scanner o impresoras.
- App mobile Expo.

## Recomendacion final

Comenzar con Sprint 1. Sin QA visual real, las siguientes mejoras se haran con demasiada intuicion. Despues del baseline, Sprint 2 y Sprint 3 deberian dar el mayor salto perceptible para tiendas reales porque impactan productos, ventas y caja diaria.
