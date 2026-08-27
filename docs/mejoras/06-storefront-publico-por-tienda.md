# Storefront Publico por Tienda (Catalogo para Clientes Finales)

Fecha: 2026-08-26

## Objetivo

Permitir que cada tienda tenga una pagina publica donde sus propios clientes (no el dueno/cajero, sino el consumidor final) vean el catalogo de productos, precios y disponibilidad. Se define en tres niveles de personalizacion crecientes, para poder vender el nivel mas simple ya, y ofrecer niveles superiores como upsell sin haber sobre-construido nada por adelantado.

Este plan asume y continua la decision ya tomada en [01-landing-page-y-arquitectura-dominios.md](01-landing-page-y-arquitectura-dominios.md#pregunta-central-subdominio-por-tienda-o-no): **el storefront no necesita subdominio propio para los niveles 1 y 2**, usa slug en la URL (`tuapp.com/t/<slug>`). El subdominio/dominio propio solo entra en juego en el Nivel 3.

## Resumen de los tres niveles

| Nivel | Que ve el cliente final | Que puede personalizar el dueno de tienda | Donde vive el codigo | A quien se lo ofreces |
|---|---|---|---|---|
| **1 — Generico** | Mismo diseno para todas las tiendas, solo cambia el contenido (nombre, productos) | Nada, activa/desactiva el catalogo y elige su slug | `apps/web`, mismo deploy que hoy | A todos los clientes, incluido en el plan base o como feature barata |
| **2 — Marca** | Mismo diseno y layout, pero con el logo/colores/banner de la tienda | Logo, color primario/secundario, banner, descripcion corta, contacto WhatsApp | `apps/web`, mismo deploy, mismos componentes — solo cambian variables CSS y datos | Upsell simple, mismo esfuerzo de mantenimiento que Nivel 1 |
| **3 — Custom** | Diseno completamente distinto, layout propio, puede tener dominio propio | Todo — es un proyecto de diseno a medida | Proyecto Next.js/estatico aparte (nuestro o de un tercero), consume la misma API publica | Cliente puntual dispuesto a pagar por un desarrollo a medida, no un feature de autoservicio |

La regla de diseno que sostiene todo esto: **los Niveles 1 y 2 son el mismo codigo con distintos datos** (cero costo de mantenimiento incremental por tienda). El Nivel 3 es deliberadamente distinto — un proyecto aparte por cliente — porque ahi el cliente esta pagando justamente por esa diferenciacion, y el volumen esperado es bajo (unos pocos clientes, no cientos).

## Estado Actual (verificado en codigo)

- No existe ningun endpoint publico de catalogo. Los unicos endpoints publicos sin autenticacion son `POST /api/v1/public/leads` (plan 01) y los de invitaciones (plan 03).
- `Store` (`apps/backend/src/domain/entities/store.py`) no tiene ningun campo relacionado a storefront (ni `slug`, ni branding).
- `Product` (`apps/backend/src/domain/entities/product.py`) tiene `photo_url`, `qr_code`, `discount_type`/`discount_value` — ya hay casi todo lo necesario para mostrar un catalogo, falta solo decidir que campos se exponen publicamente (ver Modelo de Datos).
- Ya existe rate limiting por IP a nivel global (`apps/backend/src/presentation/middleware/rate_limit.py`) y por endpoint especifico (leads, invitaciones) — se reutiliza el mismo patron para el storefront.
- Ya existe un patron de subida de imagenes con Cloudinary (usado en `ProductForm`/`ImageUploader` para fotos de producto) — se reutiliza para el logo/banner del Nivel 2.
- `docs/mejoras/01-landing-page-y-arquitectura-dominios.md` ya dejo la decision de arquitectura de URLs (slug, no subdominio) y lo marco como "Fase 5 (Futuro)" de ese plan — este documento es esa Fase 5, desarrollada en detalle.

---

## Nivel 1 — Catalogo Generico

### Alcance

- El dueno de tienda activa el storefront desde `Configuracion` y elige (o acepta el generado automaticamente) un slug unico: `tuapp.com/t/ferreteria-lopez`.
- La pagina publica muestra: nombre de tienda, grilla de productos activos (`is_active=True`) con foto, nombre, precio efectivo (ya con descuento aplicado si tiene), y disponibilidad como **si/no hay stock**, nunca la cantidad exacta (ver Riesgos).
- Pagina de detalle de producto: foto grande, descripcion basica, precio.
- Sin carrito, sin checkout, sin login — es un catalogo de consulta ("menu digital"), igual que uno comparte un catalogo por WhatsApp/Instagram pero navegable y siempre actualizado.
- Boton de contacto: WhatsApp click-to-chat con mensaje prellenado incluyendo el producto (`https://wa.me/<numero_tienda>?text=Hola, quiero consultar por <producto>`).
- Diseno unico, sin personalizacion — reusa el sistema de diseno existente (`docs/ui-design-style-enhancement/`), no el mismo layout del dashboard privado.

### Fuera de Alcance (Nivel 1)

- Carrito, pedidos, pagos.
- Busqueda avanzada/filtros por categoria (se puede agregar despues sin romper nada, no bloquea el lanzamiento).
- Multiples fotos por producto.

### Modelo de Datos

Nuevos campos en `Store` (migracion nueva, ej. `029_storefront_base.py`):

```python
storefront_enabled: bool = False
storefront_slug: str | None = None   # unico, indexado, minusculas/guiones (regex ^[a-z0-9-]{3,60}$)
storefront_tier: str = "none"        # "none" | "standard" | "branded" | "custom" — controla que nivel de personalizacion aplica el frontend
```

`storefront_tier` existe desde el Nivel 1 aunque solo tenga dos valores utiles por ahora (`none`/`standard`) porque evita otra migracion cuando se agregue Nivel 2/3 — el frontend simplemente ignora los campos de branding si el tier es `standard`.

### Arquitectura Tecnica

Backend — nuevo router publico, sin auth, con rate limiting propio (igual patron que `public_leads.py`):

```text
apps/backend/src/presentation/api/v1/public_storefront.py
  GET /api/v1/public/storefront/{slug}                    -> datos de la tienda (nombre, tier, branding si aplica)
  GET /api/v1/public/storefront/{slug}/products            -> catalogo paginado (?page=&search=)
  GET /api/v1/public/storefront/{slug}/products/{product_id} -> detalle
```

Reglas del catalogo publico:
- Solo `is_active=True` y `store.storefront_enabled=True`; si el slug no existe o el storefront esta desactivado, `404` generico (no revelar si el slug existio alguna vez).
- Nunca exponer: `cost_price`, `sku` interno, `stock` exacto, `min_stock`, ni ningun dato de otras tiendas.
- Precio expuesto = precio efectivo ya calculado con descuento (reusar `product_discount_per_unit` de `apps/backend/src/domain/entities/product.py`).
- Rate limit por `slug` ademas de por IP (una tienda con mucho trafico legitimo no debe consumir el limite de otra, y un scraper agresivo contra una tienda no debe tumbar el catalogo de las demas).

Frontend — nuevo route group dentro de `apps/web` (mismo deploy, no un proyecto aparte):

```text
apps/web/app/(storefront)/
  layout.tsx                          # layout propio: sin sidebar de dashboard, header/footer minimal
  t/[slug]/
    page.tsx                          # grilla de catalogo
    not-found.tsx                     # slug invalido o storefront desactivado
    producto/[productId]/page.tsx     # detalle de producto
```

- Server Components con `fetch` directo al backend (mismo patron que ya usa `(marketing)`), con revalidacion ISR (`revalidate: 300` — 5 min) para que la mayoria de las visitas se sirvan desde cache/CDN y no golpeen el backend.
- Sin autenticacion, sin cookies de sesion del dashboard — es codigo que corre para visitantes anonimos, hay que tener cuidado de que ningun componente importado desde `(app)/dashboard` traiga logica de sesion sin querer.

Configuracion en el dashboard (`apps/web/src/features/settings/`):
- Nueva seccion "Catalogo publico" en `SettingsOverview`, con: toggle activar/desactivar, campo de slug (autogenerado del nombre de tienda vía slugify, editable, valida unicidad contra el backend antes de guardar), y el link publico resultante con boton "Copiar".

### Archivos a Tocar

- `apps/backend/src/domain/entities/store.py` (agregar campos)
- `apps/backend/src/infrastructure/database/models/store_model.py`
- `apps/backend/src/infrastructure/database/alembic/versions/029_storefront_base.py` (nuevo)
- `apps/backend/src/application/dto/store_dto.py` (DTOs de storefront settings)
- `apps/backend/src/application/use_cases/store/update_store.py` o un nuevo `update_storefront_settings.py`
- `apps/backend/src/application/use_cases/storefront/` (nuevo: `get_public_storefront.py`, `list_public_products.py`)
- `apps/backend/src/presentation/api/v1/public_storefront.py` (nuevo)
- `apps/backend/src/presentation/api/v1/router.py`
- `apps/web/app/(storefront)/**` (nuevo)
- `apps/web/src/features/settings/components/StorefrontSettings.tsx` (nuevo)
- `apps/web/src/features/settings/schemas.ts` / `actions.ts`

### Tests Requeridos

1. Backend: slug inexistente o `storefront_enabled=False` → 404 en los tres endpoints.
2. Backend: productos inactivos nunca aparecen en el listado publico.
3. Backend: el payload de producto no incluye `cost_price`, `sku`, `stock` exacto.
4. Backend: precio expuesto coincide con el precio efectivo (con descuento aplicado).
5. Backend: rate limit por slug — exceder el limite devuelve 429 sin afectar a otro slug.
6. Frontend: activar storefront genera slug valido; slug duplicado muestra error antes de guardar.
7. Frontend: `/t/<slug>` con slug invalido renderiza `not-found` (no un 500).
8. Frontend: boton de WhatsApp arma el link con el numero y mensaje correctos.

### Criterios de Aceptacion

- Un dueno de tienda puede activar su catalogo publico y compartir un link en menos de 1 minuto desde Configuracion.
- El link funciona sin login, carga rapido (ISR/cache), y nunca expone datos internos de stock/costo.
- Desactivar el storefront hace que el link devuelva 404 inmediatamente.

---

## Nivel 2 — Personalizacion de Marca

Se construye **encima** del Nivel 1, sin cambios estructurales — mismo router publico, mismas rutas, mismos componentes. Es aditivo.

### Alcance

Nuevos campos de branding en `Store`, editables desde la misma seccion "Catalogo publico" del dashboard:

```python
storefront_logo_url: str | None = None
storefront_banner_url: str | None = None
storefront_color_primary: str | None = None    # hex, ej. "#2563EB"
storefront_color_secondary: str | None = None   # hex
storefront_description: str | None = None       # texto corto, max 280 chars
storefront_whatsapp: str | None = None           # si es distinto al telefono de la tienda
```

`storefront_tier` pasa a `"branded"` cuando la tienda tiene al menos logo o color configurado (se puede calcular, no hace falta que el usuario elija el nivel explicitamente — simplemente al personalizar algo, sube de nivel).

### Arquitectura Tecnica

- El layout de `(storefront)/t/[slug]/layout.tsx` lee `storefront_color_primary/secondary` del payload publico y los inyecta como variables CSS (`--storefront-primary`, `--storefront-secondary`) en un `<style>` inline por request — los componentes de catalogo ya usan esas variables en vez de los tokens de marca fijos del dashboard.
- Si un campo de branding es `null`, se usan los valores por defecto del sistema de diseno (fallback = Nivel 1 tal cual) — asi un campo vacio nunca rompe el diseno.
- Logo/banner: reusar el componente `ImageUploader` existente (mismo patron que fotos de producto, mismo bucket/preset de Cloudinary, con limite de tamano/formato ya validado ahi).
- Validacion de color: regex hex (`^#[0-9A-Fa-f]{6}$`) tanto en frontend (input `type="color"` + validacion de schema) como en el DTO del backend — mismo patron de validacion cruzada que se reforzo en la auditoria de esta sesion.

### Archivos a Tocar (adicionales a Nivel 1)

- `apps/backend/src/infrastructure/database/alembic/versions/030_storefront_branding.py` (nuevo)
- `apps/backend/src/application/dto/store_dto.py` (agregar campos + validacion hex)
- `apps/web/src/features/settings/components/StorefrontSettings.tsx` (agregar logo/banner/colores, con preview en vivo)
- `apps/web/app/(storefront)/t/[slug]/layout.tsx` (inyeccion de variables CSS)

### Tests Requeridos

1. Backend: color invalido (no hex) es rechazado por el DTO.
2. Backend: campos de branding nulos no rompen el endpoint publico (siguen siendo opcionales).
3. Frontend: con branding configurado, el catalogo aplica los colores de la tienda; sin branding, se ve identico al Nivel 1.
4. Frontend: preview en vivo en Configuracion refleja el cambio de color antes de guardar.

### Criterios de Aceptacion

- Dos tiendas con Nivel 2 activo se ven visualmente distintas (colores/logo) sin que exista ningun codigo especifico por tienda.
- Quitar el branding (volver campos a null) regresa al diseno generico sin error.

---

## Nivel 3 — Storefront Custom (pago, proyecto aparte)

Este es el nivel donde **si** tiene sentido la idea original de "proyecto Firebase por cliente" — pero como oferta paga y de bajo volumen, no como arquitectura por defecto para todos.

### Alcance

- Se ofrece a un cliente puntual dispuesto a pagar por un diseno a medida (layout propio, secciones custom, eventualmente dominio propio tipo `latienda.com`).
- El proyecto es codigo aparte (Next.js, o incluso un sitio estatico simple) que **consume la misma API publica** que Niveles 1/2 (`/api/v1/public/storefront/{slug}/...`) — no se duplica ni se modifica el backend para cada cliente Nivel 3.
- Se emite una API key dedicada por cliente Nivel 3 (no para Niveles 1/2, que son publicos sin key) para: (a) atribuir el trafico a ese proyecto especifico en logs/metricas, (b) asignarle un rate limit propio independiente del limite compartido por IP, para que ese sitio custom nunca se vea afectado por trafico de otras tiendas ni al reves.
- Hosting: donde el cliente/nosotros decidamos — Firebase Hosting, Vercel, su propio servidor. No es responsabilidad de nuestra infraestructura principal, es exactamente el aislamiento que buscabas en la primera pregunta, pero acotado a los pocos clientes que realmente lo pagan.
- Dominio: el cliente puede usar su propio dominio (`latienda.com`) apuntando a donde este hosteado su Nivel 3 — no pasa por `tuapp.com` en absoluto.

### Modelo de Datos

```python
storefront_tier: str = "custom"
storefront_api_key_hash: str | None = None   # hash de la key emitida, igual patron que token_hash de invitaciones (nunca texto plano)
storefront_custom_notes: str | None = None    # referencia interna: url del proyecto custom, quien lo desarrollo, etc.
```

### Arquitectura Tecnica

- Nuevo endpoint admin (protegido, solo platform_admin): `POST /api/v1/admin/stores/{id}/storefront-api-key` — genera y devuelve la key una unica vez (igual patron que credenciales que no se pueden recuperar despues, solo regenerar).
- El middleware de rate limiting (`rate_limit.py`) se extiende para reconocer un header `X-Storefront-Key`: si esta presente y es valido, usa un bucket de limite propio de esa tienda en vez del bucket compartido por IP.
- Sin mas cambios de backend — el resto de los endpoints publicos son los mismos que Nivel 1/2.

### Decision de Proceso (no tecnica)

Para el primer cliente Nivel 3, el flujo es manual:
1. Se cotiza el diseno a medida (fuera del producto, es un servicio).
2. Se genera la API key y se le entrega documentacion de los 3 endpoints publicos.
3. Se construye el proyecto aparte (nosotros o un freelancer), se despliega donde se decida.
4. Se configura su dominio propio.

**No conviene automatizar este flujo (ej. un "generador de temas" en el dashboard) hasta tener varios clientes en este tier** — con 1-3 clientes es mas barato hacerlo a mano que construir una herramienta de autoservicio que quiza nadie mas use. Si en el futuro hay 10+ clientes pidiendo temas custom, ahi si se justifica evaluar un motor de temas/page-builder dentro del mismo `apps/web` (secciones configurables por JSON) en vez de seguir sumando proyectos separados.

### Archivos a Tocar

- `apps/backend/src/infrastructure/database/alembic/versions/031_storefront_custom_api_key.py` (nuevo)
- `apps/backend/src/presentation/middleware/rate_limit.py` (reconocer `X-Storefront-Key`)
- `apps/backend/src/presentation/api/v1/admin_storefront.py` (nuevo, generacion de key)
- Proyecto del cliente: fuera de este repo (o en un repo aparte si se decide mantenerlo nosotros).

### Tests Requeridos

1. Backend: request con `X-Storefront-Key` valida usa el bucket de rate limit de esa tienda, no el de IP compartido.
2. Backend: key invalida o revocada cae al comportamiento estandar (rate limit por IP), nunca un error que tumbe el request.
3. Backend: solo `platform_admin` puede generar/regenerar la key.

### Criterios de Aceptacion

- Un cliente Nivel 3 puede tener un sitio visualmente distinto, en su propio dominio, sin que nosotros mantengamos su codigo ni su hosting.
- El trafico de su sitio nunca compite por rate limit con el resto de las tiendas (ni al reves).

---

## Riesgos y Decisiones

- **Exponer stock exacto o no.** Recomendacion: solo "disponible/agotado", nunca la cantidad. Mostrar cantidad exacta le da informacion util a la competencia (cuanto stock maneja la tienda) y no aporta valor real al cliente final. Si un dueno de tienda pide explicitamente mostrar cantidad, que sea un toggle opcional, no el default.
- **Slug unico global vs. por tienda.** El slug debe ser unico en toda la plataforma (no por tienda), porque forma parte de una URL publica compartida (`tuapp.com/t/<slug>`) — hay que validarlo asi desde el DTO, con el mismo cuidado que ya se le puso a otras unicidades (email de invitaciones, etc.).
- **Rate limiting en memoria no escala a multiples instancias.** El `in_memory_rate_limiter` actual (`apps/backend/src/infrastructure/services/rate_limit/`) es por proceso — si el backend corre en mas de una instancia detras de un balanceador, cada instancia lleva su propio conteo y el limite real termina siendo mas alto que el nominal. No es un problema para el volumen actual, pero si el storefront trae trafico publico significativo, conviene migrar a un limiter respaldado por Redis (ya hay `REDIS_URL` comentado en `.env.example`) antes de escalar horizontalmente el backend.
- **Cache/ISR vs. datos desactualizados.** Con `revalidate: 300`, un cambio de precio o un producto que se agota puede tardar hasta 5 minutos en reflejarse publicamente. Es un tradeoff aceptable para catalogo de consulta; si en el futuro el storefront permite pedidos, ahi si hace falta revalidacion mas agresiva o server-side sin cache para el flujo de compra.
- **Nivel 3 sin automatizar es trabajo manual real.** No hay que subestimar el costo operativo de construir un sitio custom por cliente — es la razon por la que este documento recomienda explicitamente NO ofrecerlo como autoservicio todavia, solo como servicio cotizado caso por caso.
