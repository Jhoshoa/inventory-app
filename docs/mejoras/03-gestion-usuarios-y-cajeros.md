# Gestion de Usuarios y Cajeros

Fecha: 2026-08-25

## Objetivo

Permitir que un `owner` administre su equipo (cajeros) desde la web, sin tocar la base de datos manualmente. Esta feature ya tiene un plan tecnico completo y detallado: [`docs/roles/sprint-2-user-management-invitations-plan.md`](../roles/sprint-2-user-management-invitations-plan.md). Este documento **no reemplaza ese plan**, lo adopta como especificacion tecnica y agrega el contexto de priorizacion comercial y el estado verificado a la fecha de esta auditoria.

## Estado Actual (verificado en codigo, 2026-08-25)

Confirmado que sigue igual a lo descrito en el plan original:

- Backend: `GET/PATCH /api/v1/users` existe y funciona, protegido por `owner`. Hay proteccion para no remover/desactivar el ultimo owner activo.
- Frontend: no existe ninguna UI de gestion de usuarios/invitaciones. `SettingsOverview` solo muestra el usuario actual, su rol y una matriz de permisos estatica. Se confirmo en la auditoria de frontend que no hay componentes de invitacion/lista de usuarios en `src/features`.
- No existe tabla `user_invitations`, ni endpoints de invitacion, ni envio de email.

**Conclusion: el plan original sigue vigente sin cambios de fondo.** Ejecutarlo tal cual esta especificado.

## Por que va en la posicion #3 del roadmap

Es la feature con menor incertidumbre de las cinco (ya esta completamente especificada: modelo de datos, endpoints, componentes, tests, criterios de aceptacion) y desbloquea el caso de uso mas comun de un negocio real: **un dueno con uno o mas empleados en caja**. Sin esto, cada tienda con mas de una persona necesita que alguien edite la base de datos manualmente para dar de alta un cajero, lo cual es inviable para vender a clientes reales.

## Alcance de Este Documento

No se repite el detalle tecnico completo (esta en el plan original). Se agregan aqui unicamente los ajustes de prioridad y las conexiones con el resto del roadmap:

1. **Ejecutar el plan original tal cual**, siguiendo su orden de pasos (migracion → repositorio/use cases → email port/token → API → UI de Settings → pagina de aceptar invitacion → tests).
2. **Decision de proveedor de email pendiente en el plan original — resolverla ahora.** El plan deja abierto "Resend, SendGrid, Supabase email invite o proveedor elegido" y dice explicitamente que no debe bloquear el sprint usando un `NoopEmailSender` en dev. Para produccion, se recomienda decidir esto en paralelo al plan de Landing Page (documento 01), porque ese plan tambien va a necesitar un servicio de email transaccional (notificaciones de leads, confirmaciones de contacto). Usar el mismo proveedor para ambos casos evita pagar/mantener dos integraciones de email distintas.
3. **Conexion con Facturacion (documento 02):** una vez que exista mas de un usuario por tienda, el `billing_email` de la tienda (usado para cobros) deberia poder ser distinto del email del `owner` — verificar que el flujo de invitaciones no asuma que solo existe un email de contacto por tienda.
4. **Conexion con Seguridad (documento 05):** el plan original ya deja anotado "Rate limit queda fuera, pero dejar nota para hardening" en el endpoint de aceptar invitacion (es un endpoint publico, sin auth, candidato a abuso). Cuando se implemente rate limiting general (documento 05), este endpoint debe quedar cubierto explicitamente.

## Fuera de Alcance

Todo lo que el plan original ya marca como fuera de alcance se mantiene igual: RBAC granular, roles custom, permisos por sucursal/caja, multi-store por usuario, auditoria completa de acciones, recuperacion de password, billing por numero de usuarios.

Nota: el plan original tambien sugiere un "Sprint 3" de auditoria operativa (quien crea ventas, quien ajusta stock, quien anula ventas) como siguiente paso natural despues de este. Se deja anotado aqui como candidato a un futuro documento 06 si el roadmap se extiende, pero no es parte de los 5 planes actuales.

## Archivos a Tocar

Ver la lista completa y detallada en `docs/roles/sprint-2-user-management-invitations-plan.md`, seccion "Implementacion Por Pasos". No se duplica aqui para evitar que ambos documentos queden desincronizados — si algo cambia de ruta o diseno, actualizar el plan original, no este resumen.

## Tests Requeridos

Ver la lista completa (15 tests backend + 10 tests frontend + 6 tests de acciones + escenarios E2E) en el plan original, seccion "Tests Requeridos".

## Criterios de Aceptacion

Los mismos del plan original, seccion "Criterios de Aceptacion". Se agrega uno:

- El proveedor de email transaccional elegido para este modulo queda documentado y es el mismo que se use para el formulario de contacto de la landing page (documento 01), salvo decision explicita en contra.

## Riesgos y Decisiones

- **Proveedor de email**: unica decision de negocio nueva que agrega este documento por encima del plan original (ver punto 2 de Alcance). Recomendacion: Resend, por ser simple de integrar en un backend Python/FastAPI y tener buen soporte para dominios `.com.bo` verificados vía DNS.
- El resto de riesgos y decisiones son los ya documentados en el plan original (flujo de invite de Supabase, token raw solo en dev, usuario con email en otra tienda, etc.) — siguen vigentes sin cambios.
