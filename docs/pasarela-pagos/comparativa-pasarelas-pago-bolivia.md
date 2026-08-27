# Comparativa de Pasarelas de Pago en Bolivia

Fecha: 2026-08-27

## Objetivo

Este documento complementa [docs/mejoras/02-facturacion-real-y-facturacion-electronica-sin.md](../mejoras/02-facturacion-real-y-facturacion-electronica-sin.md), que ya identifico la necesidad de una pasarela de pago para automatizar el cobro de la suscripcion SaaS (hoy 100% manual via WhatsApp) y propuso Libelula como candidato principal. Aca se comparan alternativas a Libelula encontradas en el mercado boliviano, para decidir con mas de una opcion evaluada.

**Importante**: la informacion de este documento viene de paginas de marketing y busqueda web, no de documentacion tecnica oficial de cada proveedor. Antes de elegir, hay que confirmar directamente con cada candidato los puntos de la seccion "Que falta confirmar antes de decidir".

## Resumen ejecutivo

Las opciones se agrupan en tres categorias, de menor a mayor nivel de abstraccion sobre el sistema bancario:

1. **APIs directas de banco** (BNB, BCP, BISA, Banco Economico) — sin intermediario, requieren cuenta comercial con ese banco especifico.
2. **OpenBCB** — herramienta gratuita del Banco Central, pensada para automatizar cobro basico, no confirmado si sirve para un flujo de suscripcion con webhooks/recurrencia.
3. **Agregadores API-first** (Libelula, CUCU, XMart Cloud, PagosNet, Mesa de Pagos, BoliviaFlow) — una sola integracion cubre varios bancos/canales. Esta es la categoria comparable a Libelula y la mas relevante para este proyecto.

**Candidato destacado a evaluar primero junto con Libelula: BoliviaFlow**, porque segun su propia descripcion combina cobro QR **y** facturacion electronica SIN en un solo paquete — si es real y madura, podria resolver de una vez las dos partes de docs/mejoras/02 (cobro de suscripcion y facturacion electronica para las tiendas clientas), en vez de evaluar dos proveedores por separado.

## Tabla comparativa

| Opcion | Categoria | Canales | Comision informada | Recurrencia automatica | Factura electronica SIN incluida | Confirmar directamente |
|---|---|---|---|---|---|---|
| **Libelula** | Agregador | Tarjetas, QR multi-banco, Tigo Money | 2.5% por transaccion, sin costo de habilitacion ni mantenimiento anual (segun su propia web) | No confirmado — ver docs/mejoras/02 | No mencionado | Soporte para cobro recurrente automatico vs. generar QR/link nuevo cada vez |
| **BoliviaFlow** | Agregador | QR Simple | No informado | No confirmado | Si, la menciona explicitamente | Si el producto esta activo/maduro (pagina encontrada parece un prototipo/demo), pricing real, cobertura de bancos |
| **CUCU** (cucu.bo) | Agregador API-first | QR Simple (BNB, BISA, Economico) | No informado | No confirmado | No | Documentacion de API, soporte de webhooks, pricing |
| **XMart Cloud** | Agregador API-first | QR Simple (BNB, BISA, Economico) | Tiene pagina de precios publica (`xmart.cloud/pricing/qr`) | No confirmado | No | Revisar la pagina de precios directamente, soporte de webhooks |
| **PagosNet** (ASOBAN / Red Enlace) | Agregador oficial interbancario | QR + tarjetas, plugins WooCommerce/Shopify | No informado | No confirmado | No | Es la red oficial de bancos asociados — probablemente mas solida institucionalmente, confirmar API para integracion custom (no solo plugins de tienda) |
| **Mesa de Pagos** | Agregador con liquidacion internacional | QR, transferencia, tarjeta | No informado | Menciona "suscripciones" explicitamente | No | **Liquida a cuenta en USD en el exterior** — complica el flujo si el negocio opera 100% en bolivianos; confirmar si tambien liquida en Bs localmente |
| **OpenBCB** | Herramienta gratuita del BCB | QR Simple | Gratis | No, orientado a generar QR y consultar estado, no a automatizacion de suscripciones | No | Si expone una API real para integrar (vs. uso manual/institucional) |
| **APIs de banco directas** (BNB, BCP, BISA, Banco Economico) | Directa | QR Simple del banco | Generalmente sin comision de intermediario (es el estandar interbancario del BCB) | No confirmado, varia por banco | No | Requiere cuenta comercial con ese banco especifico; una integracion por banco si se quiere cubrir varios |

## Detalle por opcion

### Libelula (ya evaluada en docs/mejoras/02)

Pasarela boliviana enfocada en pequenos negocios, se integra con WooCommerce/Shopify o sistemas propios. Segun su web: comision fija de 2.5% sin importar el canal que use el cliente (tarjeta, QR de banco, o Tigo Money), sin costo de habilitacion ni mantenimiento anual. Sigue siendo el candidato mas simple de evaluar primero por ser la mas conocida en el mercado boliviano para negocios chicos.

### BoliviaFlow

Se presenta como una plataforma que acepta pagos QR, maneja facturacion electronica con cumplimiento SIN, y muestra ingresos en tiempo real. Es el unico candidato encontrado que promete resolver ambas partes de docs/mejoras/02 en un solo proveedor. La pagina encontrada en la busqueda parece un prototipo o landing temprana (URL de GitHub Pages, no un dominio propio) — esto es una senal de alerta a confirmar: si el producto esta realmente en produccion y con soporte, o es un proyecto en etapa muy inicial.

### CUCU y XMart Cloud

Ambas son APIs de cobro QR Simple, enfocadas en desarrolladores ("cobra desde tu sistema"), integradas con los bancos mas grandes (BNB, BISA, Economico). Son la opcion mas parecida en forma a Libelula pero mas nueva/menos conocida — vale la pena revisar su documentacion tecnica antes de descartarlas, ya que suelen ser mas baratas que las pasarelas mas establecidas.

### PagosNet (ASOBAN / Red Enlace)

Es la iniciativa de la asociacion de bancos bolivianos (ASOBAN) a traves de Red Enlace, la red interbancaria que ya procesa cajeros automaticos y otros servicios compartidos entre bancos. Al ser una red oficial respaldada por el sistema bancario (no una startup), podria ofrecer mayor estabilidad institucional a largo plazo, pero su enfoque publico parece estar mas en plugins de tiendas online (WooCommerce/Shopify) que en una API para un backend propio — hay que confirmar si eso existe.

### Mesa de Pagos

Ofrece cobro de suscripciones y compras unicas via QR, transferencia o tarjeta, pero liquida los fondos a una cuenta en dolares en el exterior. Esto agrega conversion de divisas y probablemente costos/tiempos de repatriar el dinero a Bolivia — solo tiene sentido si el negocio ya opera con ingresos en el exterior o esta dispuesto a manejar ese flujo. Para un SaaS que cobra en bolivianos a tiendas bolivianas, es probablemente la opcion menos alineada de la lista salvo que su soporte de "suscripciones" (mencionado explicitamente en su marketing) sea significativamente mejor que el resto.

### OpenBCB

Herramienta gratuita lanzada por el Banco Central de Bolivia para generar QR de cobro y consultar el estado de una operacion, pensada para instituciones publicas y privadas que no tenian forma de automatizar su cobranza. Es gratis, pero no esta claro si ofrece lo necesario para un flujo de suscripcion SaaS (cobro recurrente, webhooks de confirmacion automatica) o si es mas para generar un QR puntual y consultarlo manualmente. Vale la pena confirmarlo porque, siendo gratis y oficial, seria la opcion mas barata si cubre lo que se necesita.

### APIs directas de banco (BNB, BCP, BISA, Banco Economico)

Cada banco grande boliviano expone su propia API de cobro QR Simple (el estandar interbancario del BCB). La ventaja es no pagar comision de intermediario; la desventaja es que requiere abrir una relacion comercial directa con ese banco (mas burocracia, tiempos de onboarding mas largos) y, si se quiere aceptar pagos desde clientes de varios bancos, hay que evaluar si el estandar QR Simple ya resuelve la interoperabilidad (cualquier app de banca movil puede leer el QR de cualquier banco) o si de todas formas hace falta una integracion por banco para consultar el estado del cobro.

## Que falta confirmar antes de decidir

Para cada candidato que se quiera evaluar en serio, las mismas preguntas que ya senalaba docs/mejoras/02 para Libelula:

1. **Cobro recurrente automatico** vs. generar un QR/link nuevo cada mes manualmente (esto define si el MVP de cobro puede ser "un boton que genera el cobro" o necesita logica de reintentos/cron mas compleja desde el dia uno).
2. **Costo real por transaccion** (comision + costos fijos si los hay).
3. **Documentacion de API publica y sandbox** — si no hay forma de probar la integracion sin ya ser cliente, es una senal de que el proceso de onboarding es mas lento.
4. **Webhooks confiables** con firma/verificacion (HMAC u otro mecanismo), para el flujo de `POST /api/v1/webhooks/<proveedor>` ya disenado en docs/mejoras/02.
5. **Soporte y tiempo de respuesta** — para un negocio chico, importa tener a quien reclamar si un cobro falla.

## Recomendacion

No cambiar la decision de arrancar con Libelula por default (ya es el candidato mas conocido y con informacion de pricing clara), pero **evaluar en paralelo BoliviaFlow** antes de firmar con nadie, especificamente por la promesa de incluir facturacion electronica SIN — si es real, evita evaluar y mantener dos integraciones de proveedores distintos para las dos partes de docs/mejoras/02. Si BoliviaFlow resulta ser un proyecto muy temprano sin soporte real, Libelula sigue siendo la opcion segura para arrancar, y CUCU/XMart Cloud quedan como alternativas mas baratas a revisar si el 2.5% de Libelula pesa mucho en el margen.

## Proximos pasos

1. Contactar a Libelula, BoliviaFlow y CUCU (o XMart Cloud) con las 5 preguntas de la seccion anterior.
2. Si BoliviaFlow confirma que su facturacion SIN esta realmente implementada y en produccion, re-evaluar si conviene fusionar los dos proveedores de docs/mejoras/02 en uno solo.
3. Una vez elegido el proveedor, actualizar docs/mejoras/02 con la decision final y continuar con el plan de implementacion ya definido ahi (scheduler, endpoint de checkout, webhook receptor, dunning).
