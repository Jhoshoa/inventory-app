# Roadmap de Mejoras para Comercializacion

Fecha: 2026-08-25

## Objetivo

Este directorio contiene el plan de trabajo para llevar el producto de "MVP funcional" a "producto vendible" a duenos de tiendas, ferreterias, almacenes y minimarkets en Bolivia. Cada archivo es un plan independiente y ejecutable, con el mismo formato usado en el resto de `docs/` (Objetivo, Estado Actual, Alcance, Modelo de Datos, Archivos a Tocar, Tests, Criterios de Aceptacion, Riesgos).

Este roadmap nace de una auditoria completa de backend y frontend hecha el 2026-08-25. Los hallazgos de esa auditoria estan resumidos en cada plan individual, en la seccion "Estado Actual".

## Orden de Ejecucion

| # | Plan | Por que va en ese orden |
|---|---|---|
| 1 | [01-landing-page-y-arquitectura-dominios.md](01-landing-page-y-arquitectura-dominios.md) | Sin una pagina publica indexable no hay forma de que un cliente nuevo encuentre el producto. Es el bloqueo de adquisicion. Ademas define dominio y marca, decisiones que afectan a todo lo demas (emails transaccionales, checkout, OG images). |
| 2 | [02-facturacion-real-y-facturacion-electronica-sin.md](02-facturacion-real-y-facturacion-electronica-sin.md) | Sin cobro automatizado no hay ingreso recurrente. Ademas se investiga un modulo nuevo de alto valor: facturacion electronica SIN para que las tiendas clientas emitan facturas fiscales validas desde el propio POS, algo que en Bolivia se vuelve obligatorio por normativa a partir de octubre 2026. |
| 3 | [03-gestion-usuarios-y-cajeros.md](03-gestion-usuarios-y-cajeros.md) | Ya existe un plan detallado (`docs/roles/sprint-2-user-management-invitations-plan.md`) parado en la fase de ejecucion. Es la feature que mas rapido se puede cerrar y desbloquea el caso de uso real de una tienda con empleados. |
| 4 | [04-offline-first-pwa.md](04-offline-first-pwa.md) | Es el diferenciador de producto (tiendas con internet inestable), pero requiere que el backend de sync ya este estable, lo cual ya es el caso. Se prioriza despues de lo comercial porque es una mejora de robustez, no de adquisicion o cobro. |
| 5 | [05-seguridad-rate-limiting-y-tests.md](05-seguridad-rate-limiting-y-tests.md) | Endurecimiento final antes de escalar trafico real: rate limiting, corregir el bug conocido de `is_active` vs `access_status`, ciclo de vida de archivado de datos, y cobertura de tests en las areas mas riesgosas (billing, webhooks). |

## Principio general

Cada plan es independiente y se puede asignar a una persona o sprint distinto, pero el orden importa: 1 y 2 tienen impacto directo en ingresos, 3 y 4 en retencion/experiencia, 5 en estabilidad a largo plazo. No se recomienda saltar el orden salvo decision explicita de negocio.

## Como usar estos documentos

Cada plan sigue esta estructura:

- **Estado Actual**: que existe hoy en el codigo (verificado, no asumido).
- **Alcance Incluido / Fuera de Alcance**: limites claros para no sobre-construir.
- **Arquitectura / Modelo de Datos**: decisiones tecnicas concretas.
- **Archivos a Tocar**: rutas reales del repo.
- **Tests Requeridos**: lista de casos a cubrir.
- **Criterios de Aceptacion**: definicion de "listo".
- **Riesgos y Decisiones**: puntos que requieren decision de negocio antes de programar.

Antes de empezar cualquier plan, revisar la seccion "Riesgos y Decisiones" porque casi todos tienen 1-2 decisiones de negocio pendientes (nombre de marca, dominio, precio del plan, proveedor de pagos) que bloquean la implementacion tecnica.
