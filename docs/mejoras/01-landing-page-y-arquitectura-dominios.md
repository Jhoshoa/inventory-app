# Landing Page, Marca y Arquitectura de Dominios

Fecha: 2026-08-25

## Objetivo

Crear una superficie publica indexable (landing + paginas comerciales) que permita adquirir clientes nuevos, y definir de una vez la arquitectura de dominios/subdominios del producto para que escale a muchas tiendas sin ambiguedad.

## Pregunta central: subdominio por tienda o no

Antes de tocar codigo hay que resolver esto porque cambia la arquitectura.

**Respuesta corta: no, las tiendas NO necesitan subdominio propio.** El multi-tenant de este producto ya esta resuelto a nivel de datos, no de URL: cada fila en casi todas las tablas tiene `store_id`, y el usuario ve solo los datos de su tienda porque el backend filtra por el `store_id` de su sesion (ver `apps/backend/src/presentation/dependencies.py` y los repositorios, que ya scopean todo por tienda). Es el mismo patron que usan Shopify, Notion o Linea para "workspaces": un solo dominio de app, aislamiento por sesion/tenant en la base de datos.

Dar subdominio por tienda (`tienda1.marca.com.bo`, `tienda2.marca.com.bo`) solo tendria sentido si en el futuro se agrega una **pagina publica por tienda** (ej. catalogo online que el dueno comparte con sus clientes, tipo "menu digital"). Eso es un feature de producto distinto (storefront publico), no un requisito de la arquitectura actual. Si se quiere en el futuro, la ruta mas simple no es DNS wildcard sino un slug en la URL (`marca.com.bo/t/mi-tienda`) porque evita certificados wildcard, configuracion DNS por cliente y complejidad de enrutamiento — se puede migrar a subdominio real despues si hace falta. **Recomendacion: no implementar nada de esto ahora; dejarlo anotado como posible Fase 5 (ver seccion Futuro).**

Entonces, la separacion real que si hace falta es otra: **marketing publico vs. producto privado**. Eso se resuelve con dos rutas posibles:

| Opcion | Como se ve | Cuando conviene |
|---|---|---|
| **A. Un solo dominio, rutas separadas** | `marca.com.bo/` (publico), `marca.com.bo/login`, `marca.com.bo/dashboard` (privado) | Ahora. Un solo deploy, un solo certificado, cero DNS extra. Es lo que ya recomendaba `docs/seo-suggestions/seo-strategy-and-code-review.md`. |
| **B. Subdominio para la app** | `www.marca.com.bo` (publico) + `app.marca.com.bo` (privado) | Mas adelante, cuando el trafico de marketing y el de producto empiecen a chocar (cache, analytics, SEO técnico) o cuando se quiera un stack de marketing distinto (ej. un CMS headless para el blog). |

**Decision para este plan: implementar Opcion A ahora.** Es reversible: cuando se quiera separar en Opcion B, solo se mueve el route group `(marketing)` a otro proyecto Next.js y se apunta el subdominio `app` al proyecto actual — no hay que rehacer nada de SEO ni de backend.

## Estado Actual (verificado en codigo)

- `apps/web/app/layout.tsx` tiene `robots: { index: false, follow: false }` global.
- `apps/web/app/robots.ts` devuelve `disallow: "/"` — bloquea todo el rastreo.
- `apps/web/app/page.tsx` solo redirige a `/login` o `/dashboard`. No existe contenido publico.
- No existe `sitemap.ts`.
- `apps/web/app/manifest.ts` usa el nombre generico "App Inventario" y no tiene `icons`.
- No existe ningun dominio propio configurado (no hay `.toml`/config de hosting con dominio; el proyecto corre con Docker Compose local, ver `docker-compose.yml` en la raiz).
- Ya existe un sistema de diseno premium implementado (`docs/ui-design-style-enhancement/`) con tokens de Tailwind — se debe **reusar**, no crear un sistema visual nuevo para el marketing.
- Ya existe un analisis SEO completo y bueno en `docs/seo-suggestions/seo-strategy-and-code-review.md`. Este plan lo convierte en tareas ejecutables y agrega lo que falta: dominio, hosting, marca, formularios de contacto, analytics y legal.

## Decisiones de negocio que bloquean el inicio (resolver primero)

Estas no son tecnicas, son de producto/negocio. Sin esto no se puede empezar a escribir copy ni comprar dominio:

1. **Nombre de marca.** "Inventory App"/"App Inventario" no sirve como marca publica (ya lo senala el doc de SEO). Se necesita un nombre corto, pronunciable, disponible como dominio `.com.bo` y como usuario en redes/WhatsApp Business. Ejercicio recomendado: generar 8-10 opciones, verificar disponibilidad de dominio y de handle en Instagram/Facebook (canales que mas usan tiendas en Bolivia), elegir 1 en menos de una semana para no bloquear el resto del plan.
2. **Dominio.** Recomendacion: comprar `marca.com.bo` (registro via NIC.bo, requiere datos del titular; si no hay empresa formal aun, se puede registrar a nombre de persona natural) y en paralelo `marca.com` si esta disponible (defensivo, redirige al `.com.bo`).
3. **Precio del plan / modelo de precios.** La pagina `/precios` no puede existir sin al menos un numero o rango. No hace falta un pricing sofisticado todavia, pero si una decision: precio fijo mensual, o "desde Bs. X" con demo para cotizar. Esto tambien alimenta el plan de facturacion (documento 02).
4. **Canal de contacto principal.** WhatsApp Business es el estandar en el mercado boliviano. Se necesita un numero dedicado (no el personal del dueno) antes de poner el boton "Contactar por WhatsApp" en produccion.

## Alcance Incluido

### Fase 1 — Base tecnica SEO (bloquea todo lo demas)

- Quitar el `noindex` global de `app/layout.tsx`.
- Mover `noindex`/`nofollow` a un layout especifico de `(app)` (dashboard) y de `(auth)` (login/register) — nunca indexar sesiones ni formularios de login.
- Reescribir `app/robots.ts` para permitir rutas publicas y bloquear `/dashboard`, `/login`, `/register`, `/api`.
- Crear `app/sitemap.ts` generando la lista de rutas publicas dinamicamente.
- Reestructurar `apps/web/app` en tres route groups: `(marketing)`, `(auth)`, `(app)` (los dos ultimos ya existen).
- Convertir `/` en la landing real (hoy es un redirect).
- Mover cualquier logica de redireccion post-login que dependia de `/` hacia `/login` (verificar `middleware.ts` si existe, y los flujos de callback de auth).

### Fase 2 — Paginas comerciales minimas

Rutas a crear dentro de `(marketing)`:

```text
app/(marketing)/layout.tsx           # header/footer publico, sin sidebar de dashboard
app/(marketing)/page.tsx             # landing principal
app/(marketing)/funcionalidades/page.tsx
app/(marketing)/precios/page.tsx
app/(marketing)/contacto/page.tsx
app/(marketing)/legal/terminos/page.tsx
app/(marketing)/legal/privacidad/page.tsx
```

Contenido minimo de `/` (landing), en este orden:

1. Hero: propuesta de valor + CTA primario ("Probar gratis" / "Solicitar demo") + CTA secundario ("Ver precios").
2. Problema: inventario desordenado, ventas sin trazabilidad, cierres de caja manuales.
3. Funcionalidades reales (no inventadas): control de stock, POS, ventas, reportes, cierre de caja, etiquetas QR, import CSV, permisos por usuario. Cada una enlaza a su seccion en `/funcionalidades`.
4. Rubros objetivo: tiendas, ferreterias, almacenes, minimarkets — con lenguaje especifico a cada uno, no generico.
5. Prueba social: placeholder de testimonios/logos (vacio con diseno listo hasta tener clientes reales — no inventar testimonios falsos).
6. Precios o llamada a cotizar (enlaza a `/precios`).
7. FAQ (min. 6 preguntas: costo, tiempo de implementacion, funciona sin internet, soporte, migracion de datos, seguridad).
8. Contacto: WhatsApp click-to-chat (`https://wa.me/<numero>?text=...`) + formulario simple.

`/precios`: al menos 1 plan claro con lo que incluye, o 2-3 planes si ya hay decision de tiers. Botones "Empezar prueba gratis" y "Hablar con ventas".

`/funcionalidades`: una seccion por modulo real del producto, screenshots o mockups del dashboard actual (se pueden tomar del ambiente local ya corriendo).

`/contacto`: formulario (nombre, tienda, telefono, rubro, mensaje) + WhatsApp + horario de atencion.

`/legal/terminos` y `/legal/privacidad`: necesarias antes de correr cualquier campana paga (Meta/Google exigen politica de privacidad enlazada) y antes de recolectar datos en el formulario de contacto.

### Fase 3 — Paginas SEO de long-tail (despues de que Fase 1-2 esten en produccion y estables)

- `/sistema-de-inventario-bolivia`
- `/software-inventario-ferreterias`
- `/software-inventario-tiendas`
- `/software-inventario-almacenes`

Cada una con contenido unico, no plantillas con una palabra cambiada (Google penaliza contenido duplicado/thin content).

### Fase 4 — Captura de leads y medicion

- Formulario de contacto/demo debe persistir en algun lado: opcion mas simple es un endpoint nuevo y minimo en el backend (`POST /api/v1/public/leads`, sin auth, con rate limiting agresivo por IP para evitar spam) que guarde en una tabla `leads` y opcionalmente notifique por email/WhatsApp. Alternativa sin tocar backend: usar un servicio externo tipo Formspree/Resend solo para el formulario, mas rapido de lanzar pero con un proveedor externo de por medio — evaluar segun cuanto se quiera controlar el dato del lead.
- Google Search Console: verificar propiedad del dominio.
- Analytics: agregar Plausible o Google Analytics 4 (recomendado Plausible u otro cookie-light si se quiere evitar el banner de cookies obligatorio; GA4 exige aviso de cookies).
- Meta Pixel/Google Ads solo si se van a correr campanas pagas — no bloqueante para el lanzamiento.

### Fase 5 — Futuro (no implementar ahora, solo dejar documentado)

- Separar `www.marca.com.bo` (marketing) de `app.marca.com.bo` (producto) cuando el trafico lo justifique.
- Catalogo publico por tienda (`marca.com.bo/t/<slug>`) si se decide vender esa feature a los dueños de tienda como forma de que ellos compartan su catalogo con sus propios clientes. Esto es un feature de producto nuevo, no de este plan.

## Fuera de Alcance

- Blog/CMS de contenido (puede evaluarse en Fase 3+ si el SEO de long-tail no alcanza).
- Multilenguaje (mercado es 100% hispanohablante Bolivia).
- Chat en vivo con bot (WhatsApp cubre ese caso de uso en este mercado).
- Rediseño visual completo — se reusa el sistema de diseño existente en `docs/ui-design-style-enhancement/`.
- Subdominio o storefront por tienda (ver Fase 5).

## Arquitectura Tecnica

```text
apps/web/app/
  layout.tsx                    # metadata base SIN noindex global
  robots.ts                     # permite publico, bloquea privado
  sitemap.ts                    # nuevo
  manifest.ts                   # actualizar name/short_name/icons
  (marketing)/
    layout.tsx                  # header/footer publico
    page.tsx                    # landing
    funcionalidades/page.tsx
    precios/page.tsx
    contacto/page.tsx
    legal/terminos/page.tsx
    legal/privacidad/page.tsx
    sistema-de-inventario-bolivia/page.tsx      # Fase 3
    software-inventario-ferreterias/page.tsx    # Fase 3
  (auth)/
    layout.tsx                  # noindex aqui
    login/page.tsx
    register/page.tsx
  (app)/
    dashboard/
      layout.tsx                # noindex aqui (ya deberia existir logica de auth, solo agregar metadata robots)
```

Reglas de metadata:

- `app/layout.tsx`: metadata publica por defecto (title template, description, OG, `robots: index/follow: true`).
- `app/(app)/dashboard/layout.tsx` y `app/(auth)/layout.tsx`: override `robots: { index: false, follow: false }`.
- Cada pagina de `(marketing)` exporta su propio `metadata` (title, description, canonical, OG image).

## Hosting y DNS

- Confirmar donde se va a desplegar (hoy el repo solo tiene `docker-compose.yml` para local/self-host; no hay config de Vercel/Fly/Railway). Si se va a producción pronto, decidir plataforma antes de comprar el dominio para saber que registros DNS configurar (A/CNAME).
- Si se autohostea con Docker Compose en un VPS: agregar un reverse proxy con TLS automatico (Caddy o Traefik) delante de `web`/`api` — hoy `docker-compose.yml` expone los puertos directo (`3010`, `8001`), sin TLS ni dominio.
- Actualizar `CORS_ALLOWED_ORIGINS` y `FRONTEND_URL` en `apps/backend/.env`/`docker-compose.yml` cuando el dominio este listo.
- Certificado TLS: Let's Encrypt vía el reverse proxy, o el proveedor de hosting si es PaaS.

## Archivos a Tocar

- `apps/web/app/layout.tsx`
- `apps/web/app/robots.ts`
- `apps/web/app/sitemap.ts` (nuevo)
- `apps/web/app/manifest.ts`
- `apps/web/app/page.tsx` (dejar de ser redirect, o mover el redirect actual a una ruta interna si aun se necesita para usuarios logueados que visitan `/`)
- `apps/web/app/(marketing)/**` (nuevo, toda la carpeta)
- `apps/web/app/(auth)/layout.tsx` (agregar metadata noindex si no existe)
- `apps/web/app/(app)/dashboard/layout.tsx` (agregar metadata noindex si no existe)
- `apps/backend/src/presentation/api/v1/public_leads.py` (nuevo, si se implementa Fase 4 con backend propio)
- `apps/backend/src/infrastructure/database/alembic/versions/xxx_create_leads_table.py` (nuevo, si aplica)
- `docker-compose.yml` / reverse proxy config (nuevo, cuando se defina hosting)

## Tests Requeridos

1. `robots.ts` permite `/` y bloquea `/dashboard`, `/login`, `/api`.
2. `sitemap.ts` incluye todas las rutas publicas y ninguna privada.
3. `(app)/dashboard` conserva `noindex` (test de metadata, no solo visual).
4. Landing renderiza sin sesion (usuario no autenticado no debe ser redirigido a `/login` al visitar `/`).
5. Usuario ya autenticado que visita `/` — decidir comportamiento (ver landing igual, o redirect directo a `/dashboard`; recomendado: mostrar landing con un CTA "Ir a mi panel" en vez de redirect forzado, para no romper el share de links de marketing).
6. Formulario de contacto: validacion de campos requeridos, rate limit por IP, mensaje de exito/error.
7. Lighthouse/Core Web Vitals minimo en landing (LCP, CLS) — agregar chequeo manual o automatizado si ya existe pipeline de perf.
8. Playwright: smoke test de que `/`, `/precios`, `/funcionalidades`, `/contacto` devuelven 200 y tienen `<title>` unico.

## Criterios de Aceptacion

- Google puede rastrear e indexar `/`, `/funcionalidades`, `/precios`, `/contacto` y no puede rastrear `/dashboard`, `/login`, `/register`.
- Existe un dominio propio apuntando al proyecto con TLS valido.
- La marca tiene nombre definitivo, reflejado en `manifest.ts`, metadata y logo/favicon.
- Un visitante nuevo puede entender que es el producto, para quien es y como contactar en menos de 10 segundos en el hero.
- El formulario de contacto/demo genera un lead capturado (en base de datos o servicio externo) y una notificacion visible al equipo.
- Existen paginas de terminos y privacidad enlazadas desde el footer.
- Search Console y analytics estan conectados y reportando datos reales.

## Riesgos y Decisiones

- **Nombre de marca y dominio son bloqueantes de todo el plan.** Recomendacion: decidir en la primera sesion de trabajo, no dejar como tarea abierta indefinida.
- **Sin hosting definido no se puede configurar DNS/TLS.** Si todavia no hay decision de infraestructura de produccion, se puede avanzar igual con Fases 1-2 en local y dejar Fase de hosting como bloqueo explicito antes de "salir a producción".
- **Formulario de contacto con backend propio vs. servicio externo**: backend propio da control total del dato (útil porque luego se cruza con ventas/onboarding) pero suma superficie a mantener (rate limiting, spam). Recomendacion: empezar con backend propio dado que ya existe la infraestructura, y aplicar rate limiting estricto desde el dia uno (este mismo problema de rate limiting general esta cubierto en el plan 05).
- **No hay presupuesto de ads aun**: Analytics/Pixel de Fase 4 puede posponerse sin bloquear el lanzamiento; lo que si es bloqueante es Search Console + sitemap, porque es gratis y es la principal fuente de trafico organico a mediano plazo.
