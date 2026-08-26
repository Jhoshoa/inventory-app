# Offline-First Real en el Frontend (PWA)

Fecha: 2026-08-25

## Objetivo

Convertir el "offline-first" en una promesa cumplida, no solo conceptual. Hoy el backend expone sync push/pull pero el frontend no tiene service worker, ni almacenamiento local-first, ni indicador de sincronizacion. Para tiendas con conexion movil inestable (el perfil tipico del mercado objetivo en Bolivia), esto es la diferencia entre un POS que funciona en la practica y uno que se cae con cualquier corte de red.

## Estado Actual (verificado en codigo)

- Backend: existen endpoints `sync` (push/pull) segun el README del backend (`apps/backend/README.md`) — "sync: push/pull product changes and pull sale updates". Esta capacidad ya existe del lado servidor.
- Frontend: no hay `serviceWorker`, `workbox`, `next-pwa` ni ninguna referencia a almacenamiento offline en `apps/web/src`. El `manifest.ts` existe (requisito minimo de PWA) pero **no tiene `icons`**, por lo que "Agregar a pantalla de inicio" en un telefono se veria con un icono generico o roto.
- El POS (`app/(app)/dashboard/pos`) depende de conexion en vivo al backend para cada operacion.

## Alcance Incluido

### Fase 1 — PWA basica (bajo esfuerzo, alto impacto percibido)

1. Completar `manifest.ts`: agregar `icons` (192x192, 512x512, y `maskable` para Android), `theme_color`, `background_color` consistentes con el sistema de diseno ya existente.
2. Registrar un service worker minimo (via `next-pwa` o `@ducanh2912/next-pwa`, que es el fork mantenido compatible con App Router) que cachee assets estaticos (JS/CSS/fuentes) para que la app cargue instantaneamente en visitas repetidas, aunque no haya red.
3. Pantalla/estado offline explicito: si no hay conexion y no hay cache util, mostrar un mensaje claro en vez de una pantalla en blanco o un error generico.

### Fase 2 — Datos locales para el POS (el nucleo real del offline-first)

Esta es la parte que realmente importa para el caso de uso de venta sin internet:

1. Elegir almacenamiento local: IndexedDB (via una libreria como Dexie.js, que da una API mas simple que IndexedDB nativo) para persistir: catalogo de productos de la tienda (con su stock), ventas pendientes de sincronizar, tipo de cambio vigente.
2. Al cargar el POS con conexion, descargar/actualizar el catalogo local (usa el endpoint `sync pull` ya existente).
3. Al registrar una venta sin conexion: guardarla en IndexedDB con estado `pending_sync`, descontar el stock localmente (optimista), y mostrar un indicador visual claro ("3 ventas pendientes de sincronizar").
4. Al recuperar conexion (evento `online` del navegador, o reintento periodico): enviar las ventas pendientes al endpoint `sync push` en orden, marcar como sincronizadas, y traer cualquier cambio de stock que haya ocurrido en el servidor mientras tanto (por ejemplo si otro cajero vendio el mismo producto desde otro dispositivo).
5. **Resolucion de conflictos**: definir la regla para cuando el stock local y el del servidor no coinciden al sincronizar (ej. dos cajeros vendieron el ultimo producto en simultaneo estando ambos offline). Revisar si ya existe una decision documentada en `docs/venta-concurrencia/` — si existe, reusarla; si no, la regla minima recomendada es: el servidor es la fuente de verdad final, y si una venta offline dejaria el stock en negativo al sincronizar, la venta se marca como `sync_conflict` para revision manual del dueno, no se descarta silenciosamente ni se fuerza un stock negativo.

### Fase 3 — Indicadores de UX

1. Badge de estado de conexion visible en el header (online / offline / sincronizando).
2. Contador de ventas pendientes de sincronizar.
3. Notificacion cuando la sincronizacion se completa o falla.

## Fuera de Alcance

- Sincronizacion en background real (Background Sync API) — depende de soporte de navegador desigual; para v1, sincronizar al detectar el evento `online` y al abrir la app es suficiente.
- Offline completo para modulos que no son criticos en el momento de la venta (reportes, configuracion) — estos pueden requerir conexion sin problema.
- Multi-dispositivo con resolucion de conflictos avanzada (CRDT, etc.) — la regla simple de Fase 2 punto 5 es suficiente para el volumen esperado de una tienda pequena.

## Arquitectura Tecnica

```text
apps/web/
  public/sw.js                          # generado por next-pwa, o custom si se necesita mas control
  src/lib/offline/
    db.ts                               # instancia Dexie (IndexedDB)
    syncEngine.ts                       # push/pull, cola de reintentos
    useConnectionStatus.ts              # hook: online/offline + pendientes
  src/features/pos/
    hooks/useOfflinePos.ts              # integra syncEngine con el flujo de venta
  src/components/layout/ConnectionBadge.tsx   # nuevo
```

Backend: no deberia requerir cambios grandes si `sync push/pull` ya soporta idempotencia (verificar que un push repetido de la misma venta, por reintento de red, no duplique la venta — revisar si ya usa un id generado en cliente como clave de idempotencia; si no, agregarlo es un prerequisito de esta fase).

## Archivos a Tocar

- `apps/web/next.config.ts` (integrar plugin PWA)
- `apps/web/app/manifest.ts` (icons, theme_color)
- `apps/web/public/icons/*` (nuevos assets, 192/512/maskable)
- `apps/web/src/lib/offline/db.ts` (nuevo)
- `apps/web/src/lib/offline/syncEngine.ts` (nuevo)
- `apps/web/src/features/pos/**` (integrar modo offline)
- `apps/web/src/components/layout/ConnectionBadge.tsx` (nuevo)
- `apps/backend/src/presentation/api/v1/sync.py` (verificar/agregar idempotencia por id de venta generado en cliente, si no existe)

## Tests Requeridos

1. `useConnectionStatus` reporta `offline` correctamente al simular `navigator.onLine = false`.
2. Una venta creada sin conexion se guarda en IndexedDB con estado `pending_sync`.
3. Al volver la conexion, las ventas pendientes se envian y quedan marcadas como sincronizadas.
4. Un push duplicado de la misma venta (simulando reintento de red) no crea una venta duplicada en el backend.
5. Conflicto de stock al sincronizar marca la venta como `sync_conflict` en vez de fallar silenciosamente o forzar stock negativo.
6. El manifest genera un icono valido y `next-pwa` registra el service worker en build de produccion (Playwright/Lighthouse PWA audit).
7. La app carga (shell basico) estando completamente offline en una segunda visita (test de cache del service worker).

## Criterios de Aceptacion

- Un cajero puede completar una venta en el POS sin conexion a internet, y esta se sincroniza automaticamente al recuperar la senal.
- El usuario siempre sabe si esta offline y cuantas ventas estan pendientes de sincronizar.
- Ninguna venta se pierde por un corte de red (verificado con test de reintento/duplicacion).
- Lighthouse PWA audit pasa el check basico de instalabilidad (manifest + service worker + icons).

## Riesgos y Decisiones

- **Regla de resolucion de conflictos de stock** es una decision de producto, no solo tecnica — el dueno del negocio debe validar que "marcar para revision manual" es aceptable, versus otras alternativas (ej. permitir stock negativo temporalmente con alerta). Revisar contra lo ya decidido en `docs/venta-concurrencia/` antes de asumir nada nuevo.
- **Esfuerzo esta concentrado en Fase 2**, que es sustancialmente mas compleja que Fase 1 (PWA basica). Se puede lanzar Fase 1 como una mejora rapida y visible mientras Fase 2 se desarrolla con mas tiempo.
- **Prerequisito de idempotencia en el backend**: si el endpoint de sync push no es ya idempotente por id de venta, este plan no se puede cerrar de forma segura sin ese fix primero — verificar esto como primer paso tecnico antes de construir el resto de Fase 2.
