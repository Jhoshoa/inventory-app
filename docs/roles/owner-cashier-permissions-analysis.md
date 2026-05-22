# Owner and Cashier Permissions Analysis

## Contexto

El sistema ya tiene una columna `role` en `users` y usa los valores simples `owner` y `cashier`. En este momento el seed local solo crea un usuario demo con rol `owner`, pero el modelo, los DTOs, algunos tests y varias validaciones ya reconocen el rol `cashier`.

La pregunta clave no es si la base permite crear un cajero, sino si el producto queda consistente cuando ese cajero entra al sistema. Hoy la respuesta es: parcialmente. Hay controles importantes en backend y algunos controles en UI, pero todavia no existe una matriz completa de permisos aplicada de punta a punta.

## Estado Actual

### Backend

El backend tiene una dependencia `require_owner` que bloquea acciones si el usuario no tiene rol `owner`. Esto ya protege varias operaciones sensibles:

- Exportar CSV de productos, ventas y movimientos.
- Confirmar importaciones de inventario desde imagen.
- Anular ventas.
- Actualizar datos de la tienda.
- Listar usuarios.
- Cambiar roles de usuarios.
- Activar o desactivar usuarios.
- Eliminar productos.

Tambien existen validaciones para no dejar la tienda sin ningun `owner` activo. Esto es importante porque evita que una tienda quede sin administrador.

Sin embargo, varios endpoints todavia dependen solo de `get_current_user`, que valida autenticacion basica y `store_id`, pero no siempre valida el rol contra la tabla local de usuarios. En la practica, un `cashier` podria seguir accediendo a varias acciones operativas, incluyendo algunas que podrian considerarse administrativas segun la politica final.

Acciones que hoy parecen permitidas para cualquier usuario autenticado:

- Ver dashboard.
- Ver productos.
- Ver productos para POS.
- Crear ventas.
- Listar y consultar ventas.
- Ver reportes.
- Ver movimientos de stock.
- Crear importaciones desde imagen.
- Revisar o editar items de importacion.
- Cancelar importaciones.
- Crear productos.
- Editar productos.
- Ajustar stock.
- Consultar tienda.
- Usar sync.
- Usar exchange rates.
- Subir fotos.

Algunas de estas acciones probablemente deben seguir disponibles para `cashier`, como vender y consultar productos. Otras necesitan una decision de producto, especialmente crear/editar productos, ajustar stock, modificar importaciones y cancelar importaciones.

### Web UI

La web ya tiene helpers de permisos en `apps/web/src/lib/auth/permissions.ts`:

- `canExport`
- `canVoidSale`
- `canManageSettings`
- `canConfirmImport`

Estos helpers hoy devuelven `true` solo para `owner`. Se usan en algunas partes:

- El panel de exportes deshabilita acciones para `cashier`.
- El panel de confirmacion de importaciones bloquea la confirmacion para `cashier`.
- La pantalla de ajustes muestra el rol actual y una matriz informativa.

Pero la UI no aplica permisos de manera completa:

- El sidebar muestra todas las secciones a todos los roles.
- La pantalla de detalle de venta muestra el boton de anular venta si la venta esta completada, sin revisar rol.
- La tabla y detalle de productos muestran editar, ajustar stock y eliminar sin revisar rol.
- Las paginas de crear y editar producto no tienen guard de rol.
- La pantalla de ajustes no bloquea contenido por rol; solo informa.
- La gestion real de usuarios esta marcada como pendiente.

Esto significa que un `cashier` podria ver botones o pantallas que luego fallan con `403` en backend, y en algunos casos podria ejecutar acciones que backend todavia no restringe.

## Riesgos Actuales

### Experiencia inconsistente

Si hoy creamos un `cashier` real, el usuario puede ver acciones que no deberia usar. Aunque backend bloquee algunas, la experiencia seria confusa porque la UI lo invita a intentar acciones que luego fallan.

### Permisos incompletos en endpoints

Backend protege varias acciones de alto impacto, pero no todas las operaciones potencialmente administrativas. La decision mas sensible es stock/productos:

- Si un cajero puede ajustar stock, puede alterar inventario sin vender.
- Si un cajero puede editar precios o crear productos, puede afectar operaciones y reportes.
- Si un cajero puede editar items de importaciones, puede introducir productos no revisados por un owner.

### Autorizacion basada en session vieja

La web guarda el rol en la sesion/cookie. Si un owner cambia el rol de un usuario, hay que considerar cuanto tarda la UI en reflejar ese cambio. El backend debe seguir siendo la fuente autoritativa para cualquier accion sensible.

### Dev mode limitado

En modo debug el login local devuelve siempre el usuario dev como `owner`. Esto dificulta probar manualmente la experiencia real de `cashier` sin cambiar datos a mano o agregar un flujo demo especifico.

## Politica Recomendada Para MVP

Para empezar conviene mantener solo dos roles:

- `owner`: administra la tienda, usuarios, inventario, reportes y acciones sensibles.
- `cashier`: vende, consulta productos, consulta ventas y puede operar el POS.

Permisos recomendados para `cashier` en MVP:

- Acceder a POS.
- Buscar productos.
- Ver stock disponible.
- Crear ventas.
- Consultar ventas propias o de la tienda, segun decision operativa.
- Ver dashboard basico si no expone informacion sensible.
- Ver productos en modo lectura.

Permisos recomendados solo para `owner` en MVP:

- Crear productos.
- Editar productos.
- Eliminar productos.
- Ajustar stock manualmente.
- Confirmar importaciones.
- Cancelar importaciones, si se considera accion administrativa.
- Editar items de importaciones, si impacta catalogo o stock.
- Anular ventas.
- Exportar CSV.
- Actualizar datos de tienda.
- Invitar usuarios.
- Cambiar roles.
- Activar o desactivar usuarios.
- Ver o administrar configuracion.

Una variante razonable es permitir que `cashier` cree borradores de importacion o productos sugeridos, pero que solo `owner` pueda confirmarlos. Eso mantiene velocidad operativa sin perder control.

## Recomendacion A Corto Plazo

### 1. Crear usuario cashier demo

Agregar al seed local un usuario idempotente, por ejemplo:

- `cashier@local.dev`
- rol `cashier`
- misma tienda demo
- activo

Esto permite probar manualmente la matriz de permisos.

En debug tambien conviene agregar una forma simple de iniciar sesion como cashier. Puede ser una de estas opciones:

- Endpoint `/auth/dev-login?role=cashier`.
- Credenciales especiales en `/auth/login`, por ejemplo `cashier@local.dev`.
- Un segundo boton en UI de login solo cuando `DEBUG=true`.

La opcion mas simple y explicita es que `dev-login` acepte rol en debug, pero debe seguir deshabilitado fuera de desarrollo.

### 2. Definir una matriz de permisos unica

Documentar y codificar una matriz minima. No hace falta RBAC completo todavia. Puede ser un archivo simple compartido conceptualmente entre backend y frontend:

| Accion | owner | cashier |
|---|---:|---:|
| Ver POS | si | si |
| Crear venta | si | si |
| Ver productos | si | si |
| Crear producto | si | no |
| Editar producto | si | no |
| Eliminar producto | si | no |
| Ajustar stock | si | no |
| Ver ventas | si | si |
| Anular venta | si | no |
| Ver reportes | si | si |
| Exportar CSV | si | no |
| Subir imagen importacion | si | si, opcional |
| Editar importacion | si | no |
| Confirmar importacion | si | no |
| Ajustes tienda | si | no |
| Gestion usuarios | si | no |

Esta matriz debe guiar tanto backend como UI.

### 3. Cerrar backend primero

El backend debe ser la fuente de verdad. Antes de pulir UI, hay que aplicar dependencias por accion:

- Cambiar endpoints administrativos a `require_owner`.
- Usar `require_active_user` para endpoints que hoy leen solo el token bruto cuando corresponda.
- Evitar depender exclusivamente del rol que venga en metadata del JWT cuando la tabla local ya tiene `users.role`.
- Agregar tests de integracion para `cashier` en cada accion sensible.

Tests minimos recomendados:

- `cashier` puede crear venta.
- `cashier` puede consultar productos.
- `cashier` no puede crear producto.
- `cashier` no puede editar producto.
- `cashier` no puede ajustar stock.
- `cashier` no puede eliminar producto.
- `cashier` no puede anular venta.
- `cashier` no puede exportar CSV.
- `cashier` no puede cambiar datos de tienda.
- `cashier` no puede listar o modificar usuarios.

### 4. Alinear la UI

Luego de cerrar backend, la UI debe evitar mostrar acciones no disponibles:

- Filtrar items del sidebar por rol.
- Ocultar o deshabilitar botones administrativos.
- Proteger paginas completas como ajustes, crear producto y editar producto.
- Pasar `session.role` a componentes que muestran acciones sensibles.
- Mantener mensajes claros cuando el usuario no tiene permiso.

Para MVP, ocultar acciones suele ser mejor que mostrar botones deshabilitados en pantallas operativas. En secciones como reportes puede ser util mostrar una explicacion breve: el cajero puede ver reportes, pero no exportar.

## Invitacion De Cashier Por Correo

### Objetivo

Permitir que un `owner` invite cajeros sin crear usuarios manualmente en base de datos ni compartir credenciales.

### Flujo recomendado

1. El owner entra a `Ajustes > Usuarios`.
2. Ingresa email y nombre opcional del cajero.
3. Backend crea una invitacion con:
   - `store_id`
   - `email`
   - `role = cashier`
   - `status = pending`
   - `expires_at`
   - token de invitacion hasheado
4. Se envia un correo con link de invitacion.
5. El cajero abre el link y crea su password.
6. Backend/Supabase crea o confirma el usuario.
7. Backend crea o actualiza el registro local en `users` con rol `cashier`.
8. La invitacion pasa a `accepted`.

### Modelo sugerido

Tabla `user_invitations`:

- `id`
- `store_id`
- `email`
- `role`
- `token_hash`
- `status`
- `expires_at`
- `invited_by_user_id`
- `accepted_by_user_id`
- `created_at`
- `accepted_at`
- `revoked_at`

Estados:

- `pending`
- `accepted`
- `expired`
- `revoked`

### Consideraciones

- Solo `owner` puede invitar.
- En MVP solo se invita `cashier`.
- No permitir invitar un email que ya pertenece a otra tienda, salvo que el producto soporte multi-tienda por usuario.
- El token debe guardarse hasheado, no en texto plano.
- Las invitaciones deben expirar.
- Reenviar invitacion debe invalidar o rotar token.
- El correo no debe incluir informacion sensible mas alla del nombre de la tienda y el link.

## Plan Mediano Plazo

### Fase 1: Permisos simples owner/cashier

Prioridad alta. Esta fase debe dejar el sistema consistente con los dos roles actuales.

Entregables:

- Seed con usuario `cashier`.
- Dev login para probar owner y cashier.
- Matriz owner/cashier documentada.
- Backend cerrado con `require_owner` o `require_active_user` segun accion.
- Tests de permisos por endpoint.
- Sidebar y botones filtrados por rol.
- Paginas administrativas protegidas.

Esta fase no necesita RBAC generico.

### Fase 2: Gestion de usuarios

Prioridad media. Agrega capacidades operativas para tiendas reales.

Entregables:

- Pantalla de usuarios.
- Listado de usuarios por tienda.
- Activar/desactivar usuarios.
- Cambiar rol owner/cashier.
- Proteccion contra remover el ultimo owner activo.
- Invitacion por correo para cajeros.
- Reenvio y revocacion de invitaciones.

### Fase 3: Auditoria operativa

Prioridad media. Importante cuando haya varios cajeros.

Entregables:

- Registrar `created_by` o `user_id` en ventas.
- Registrar usuario que ajusta stock.
- Registrar usuario que anula venta.
- Registrar usuario que confirma importacion.
- Mostrar historial con responsable.
- Filtrar ventas por cajero si hace sentido para la tienda.

Esto permite responder preguntas como quien hizo una venta, quien ajusto stock o quien anulo una transaccion.

## RBAC A Futuro

RBAC completo no deberia ser el primer paso. Para este producto, `owner` y `cashier` cubren bien el MVP y reducen complejidad.

Conviene considerar RBAC cuando aparezcan necesidades reales como:

- Roles personalizados por tienda.
- Permisos granulares por pantalla o accion.
- Diferenciar supervisor, inventario, cajero y contador.
- Permitir que algunos cajeros anulen ventas hasta cierto monto.
- Permitir ajustes de stock solo a usuarios de inventario.
- Permisos por sucursal o caja.

Un RBAC futuro podria introducir:

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

Permisos ejemplo:

- `sales:create`
- `sales:void`
- `products:read`
- `products:create`
- `products:update`
- `products:delete`
- `stock:adjust`
- `imports:create`
- `imports:confirm`
- `reports:read`
- `exports:create`
- `users:manage`
- `store:update`

Pero esto debe venir despues de validar el uso real. Implementarlo demasiado pronto agregaria tablas, UI y reglas que el producto todavia no necesita.

## Recomendacion Final

La mejor ruta es no saltar directo a RBAC. Primero hay que terminar bien el modelo simple `owner/cashier`.

Orden recomendado:

1. Crear cajero demo y dev-login como cashier.
2. Definir la matriz de permisos MVP.
3. Cerrar permisos en backend con tests.
4. Ajustar UI para que el cajero vea solo lo que puede usar.
5. Agregar gestion de usuarios e invitaciones por correo.
6. Agregar auditoria de acciones por usuario.
7. Evaluar RBAC solo cuando los dos roles ya no alcancen.

Esto mantiene el sistema simple para vender y operar, pero evita que el rol `cashier` sea solo un dato decorativo en la tabla `users`.
