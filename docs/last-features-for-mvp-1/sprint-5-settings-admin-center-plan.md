# Sprint 5: Settings como centro administrativo

Fecha: 2026-06-07

## Objetivo

Elevar `/dashboard/settings` para que se sienta como una pantalla administrativa real de tienda, no como una pagina temporal de ajustes.

## Alcance

- Reorganizar settings en secciones escaneables:
  - tienda;
  - usuario actual;
  - permisos;
  - categorias;
  - operacion diaria;
  - usuarios futuro.
- Reemplazar "Gestion de usuarios pendiente" por un bloque profesional de "Planificado".
- Mejorar jerarquia visual del resumen inicial.
- Hacer mas claras las capacidades de owner/cashier.
- Mantener acciones condicionadas por rol sin cambiar permisos.
- Agregar tests para la nueva estructura administrativa.

## Componentes objetivo

- `SettingsOverview`
- `PermissionMatrix`
- `ProductCategorySettings` solo como contenido embebido, sin cambiar negocio
- `StoreDayStatusPanel` solo como contenido embebido, sin cambiar negocio

## Fuera de alcance

- Implementar invitaciones reales.
- Cambiar roles o permisos.
- Crear configuracion avanzada de tienda.
- Cambiar backend o endpoints.
- Sistema global de notificaciones.

## Criterios de aceptacion

- Settings se escanea como centro administrativo.
- Tienda y usuario actual se distinguen claramente.
- Permisos se explican sin parecer una tabla temporal.
- Categorias y operacion diaria mantienen acciones existentes.
- Usuarios futuro se presenta como planificado, no como pendiente roto.
- Owner y cashier ven informacion coherente con su rol.
- Typecheck, lint, unit tests, build y e2e pasan.

## Plan tecnico

1. `SettingsOverview`
   - Crear un resumen administrativo superior con tarjetas compactas.
   - Separar "Tienda" y "Usuario actual".
   - Agrupar secciones en un grid principal.
   - Reemplazar `EmptyState` temporal de usuarios por bloque planificado.

2. `PermissionMatrix`
   - Mantener tabla densa.
   - Agregar contexto de version/alcance sin cambiar datos.
   - Mejorar nombres visuales de roles.

3. Tests
   - Actualizar `SettingsOverview.test.tsx` para verificar la nueva estructura.
   - Cubrir bloque "Planificado" y resumen de tienda/usuario.
   - Mantener pruebas de permisos y operacion diaria.

## Validacion requerida

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```
