# SEO strategy and code review

Fecha: 2026-06-08

## Resumen ejecutivo

El SEO de este producto no debe depender del dashboard actual. El codigo de `apps/web` esta construido como una aplicacion operativa privada: login, dashboard, POS, productos, ventas, reportes y ajustes. Esa parte debe seguir siendo privada y no indexable.

La recomendacion senior es crear una superficie publica separada para adquisicion comercial: una landing y paginas SEO especificas que expliquen el producto, funcionalidades, casos de uso, precios, soporte local y contacto. Esa superficie puede vivir dentro del mismo proyecto Next.js, pero debe estar separada conceptualmente de la app autenticada.

Decision recomendada:

- Mantener `/dashboard`, `/login`, `/register`, `/api/*` como no indexables.
- Convertir `/` en una pagina publica comercial, no en un redirect directo a `/login`.
- Mover el acceso al software a rutas como `/login` y `/dashboard`.
- Crear paginas publicas para funcionalidades, rubros, precios y mercado Bolivia.
- Usar un dominio local si el mercado principal es Bolivia, idealmente `.com.bo`, pero no confiar solo en el dominio.

## Estado actual encontrado en el codigo

Archivos revisados:

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/robots.ts`
- `apps/web/app/manifest.ts`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/register/page.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/app/(app)/dashboard/products/page.tsx`
- `apps/web/app/(app)/dashboard/pos/page.tsx`
- `apps/web/src/components/layout/navigation.ts`

Hallazgos:

1. `apps/web/app/layout.tsx` define `robots: { index: false, follow: false }`.
   Esto le dice a Google que no indexe la web completa.

2. `apps/web/app/robots.ts` devuelve `disallow: "/"`.
   Esto bloquea el rastreo de todo el sitio.

3. `apps/web/app/page.tsx` redirige automaticamente a `/dashboard` o `/login`.
   Eso esta bien para una app privada, pero es malo para SEO porque no existe una pagina publica con contenido indexable.

4. No encontre `sitemap.ts`, metadata por paginas publicas, Open Graph especifico ni paginas comerciales.

5. La navegacion actual usa nombres internos: `Dashboard`, `POS`, `Productos`, `Ventas`, `Reportes`, `Ajustes`.
   Estos nombres son adecuados dentro del software. No deberian ser la base de la estrategia SEO publica.

## Sobre el dominio `.com.bo`

Un dominio `.com.bo` puede ayudar para Bolivia porque comunica orientacion geografica local tanto a usuarios como a buscadores. Tambien puede generar confianza comercial si el cliente esta en Bolivia.

Pero el dominio no reemplaza el contenido. Una web `.com.bo` pobre no posicionara mejor que una `.com` con paginas utiles, rapidas y especificas.

Recomendacion:

- Si el mercado principal es Bolivia: usar `marca.com.bo`.
- Si despues quieren expandirse: tambien comprar `marca.com` si esta disponible.
- Configurar una sola version canonica. Por ejemplo, usar `https://marca.com.bo` como principal y redirigir las demas variantes.

## Nombre del producto

`Inventory App` es demasiado generico para una marca publica. Sirve como nombre interno de proyecto, pero no como posicionamiento comercial fuerte.

Opciones recomendadas:

- Crear una marca propia y usar SEO descriptivo en titulos y textos.
- Evitar que el producto se llame solamente "Sistema de Inventario", porque es descriptivo pero dificil de proteger como marca.
- Combinar marca + categoria.

Ejemplo:

- Marca: `Stockia`, `Inventra`, `KardexPro`, `AlmaPOS`, `TiendaStock`.
- Titulo SEO: `Sistema de inventario y ventas para negocios en Bolivia | Marca`.
- H1 publico: `Sistema de inventario para tiendas, almacenes y ferreterias en Bolivia`.

No estoy recomendando esos nombres como definitivos; son ejemplos de estructura. Lo importante es que la marca sea recordable y que la pagina explique claramente la categoria.

## Arquitectura recomendada de paginas publicas

Crear estas rutas publicas:

```text
/
/funcionalidades
/precios
/contacto
/demo
/sistema-de-inventario-bolivia
/software-inventario-ferreterias
/software-inventario-tiendas
/software-inventario-almacenes
/funcionalidades/control-de-stock
/funcionalidades/punto-de-venta
/funcionalidades/reportes-de-ventas
/funcionalidades/etiquetas-qr
/funcionalidades/cierre-de-caja
```

Prioridad inicial:

1. `/`
   Landing principal. Debe vender el producto y explicar para quien es.

2. `/precios`
   Pagina clara con planes, que incluye, limites, soporte y llamada a contacto/demo.

3. `/funcionalidades`
   Resumen de modulos reales: inventario, POS, ventas, reportes, cierres, etiquetas QR, usuarios/permisos.

4. `/sistema-de-inventario-bolivia`
   Pagina local orientada a busquedas en Bolivia.

5. Paginas por rubro:
   Ferreterias, tiendas, almacenes, minimarkets, distribuidoras.

## Que hacer con los modulos actuales

Los nombres internos del dashboard no necesitan cambiar de inmediato. Para usuarios autenticados son entendibles.

Sugerencias internas menores:

- `Dashboard` puede quedarse, aunque para usuarios finales podria ser `Inicio` o `Resumen`.
- `POS` es correcto si el usuario entiende el termino. Si el mercado no es tecnico, usar `Punto de venta`.
- `Productos` esta bien.
- `Ventas` esta bien.
- `Reportes` esta bien.
- `Ajustes` esta bien.

Para SEO publico, usar nombres mas descriptivos:

- `Control de inventario`
- `Punto de venta`
- `Reportes de ventas`
- `Cierre de caja`
- `Etiquetas QR`
- `Gestion de productos`
- `Permisos por usuario`

## Propuesta de estructura Next.js

Dentro de `apps/web/app`, separar rutas publicas y privadas:

```text
app/
  (marketing)/
    page.tsx
    funcionalidades/page.tsx
    precios/page.tsx
    contacto/page.tsx
    sistema-de-inventario-bolivia/page.tsx
  (auth)/
    login/page.tsx
    register/page.tsx
  (app)/
    dashboard/
      layout.tsx
      page.tsx
      products/page.tsx
      pos/page.tsx
      sales/page.tsx
      reports/page.tsx
      settings/page.tsx
  robots.ts
  sitemap.ts
  layout.tsx
```

Cambio importante:

- Quitar el `noindex` global de `app/layout.tsx`.
- Poner `noindex` solo en layouts o paginas privadas.
- Cambiar `robots.ts` para permitir paginas publicas y bloquear privadas.

Ejemplo conceptual:

```ts
// app/(app)/dashboard/layout.tsx
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
```

```ts
// app/robots.ts
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/funcionalidades", "/precios", "/contacto"],
        disallow: ["/dashboard", "/login", "/register", "/api"],
      },
    ],
    sitemap: "https://marca.com.bo/sitemap.xml",
  };
}
```

## Metadata recomendada

Metadata global publica:

```ts
export const metadata = {
  applicationName: "Marca",
  title: {
    default: "Sistema de inventario para negocios en Bolivia | Marca",
    template: "%s | Marca",
  },
  description:
    "Controla inventario, ventas, reportes, cierres de caja y etiquetas QR desde un sistema pensado para tiendas, almacenes y ferreterias en Bolivia.",
};
```

Ejemplos por pagina:

- `/`
  - Title: `Sistema de inventario para negocios en Bolivia | Marca`
  - Description: `Gestiona productos, stock, ventas, reportes y cierres de caja en una sola plataforma para tiendas y almacenes.`

- `/precios`
  - Title: `Precios del sistema de inventario | Marca`
  - Description: `Planes para controlar inventario, punto de venta, reportes y usuarios segun el tamano de tu negocio.`

- `/funcionalidades/punto-de-venta`
  - Title: `Punto de venta conectado al inventario | Marca`
  - Description: `Registra ventas y descuenta stock automaticamente con un POS simple para tiendas y comercios.`

- `/software-inventario-ferreterias`
  - Title: `Software de inventario para ferreterias en Bolivia | Marca`
  - Description: `Controla productos, stock minimo, ventas, reportes y codigos QR para ferreterias.`

## Contenido minimo de la landing

La pagina principal deberia incluir:

- Hero claro:
  `Sistema de inventario y ventas para negocios en Bolivia`

- Subtitulo:
  `Controla productos, stock, ventas, cierres de caja y reportes desde una plataforma simple para tiendas, almacenes y ferreterias.`

- CTA principal:
  `Solicitar demo` o `Probar ahora`

- CTA secundario:
  `Ver precios`

- Secciones:
  - Problema: inventario desordenado, ventas sin trazabilidad, falta de reportes.
  - Funcionalidades: stock, POS, ventas, reportes, etiquetas QR, cierre de caja, permisos.
  - Rubros: tiendas, ferreterias, almacenes, minimarkets.
  - Beneficios: menos errores, mejor control, reportes claros.
  - Precios o llamada a cotizar.
  - Preguntas frecuentes.
  - Contacto por WhatsApp o formulario.

## Paginas que mas conviene crear para posicionar

Para Bolivia, las mejores oportunidades iniciales probablemente sean long-tail keywords. Son busquedas menos competidas y mas cercanas a compra.

Crear paginas como:

- `Sistema de inventario en Bolivia`
- `Software de inventario para ferreterias`
- `Sistema POS para tiendas en Bolivia`
- `Control de stock para almacenes`
- `Programa para registrar ventas e inventario`
- `Sistema de inventario con codigos QR`
- `Sistema para cierre de caja diario`

Cada pagina debe tener contenido real. No copiar y pegar el mismo texto cambiando una palabra.

## Contenido local para Bolivia

Incluir de forma natural:

- Moneda local si aplica.
- Ejemplos de negocios bolivianos.
- Contacto local.
- WhatsApp con codigo del pais.
- Horarios de atencion.
- Casos de uso para tiendas, ferreterias, almacenes y ventas presenciales.
- Terminos que usa el mercado local: inventario, stock, almacen, caja, ventas, productos, reportes.

Si existe empresa formal:

- Crear Google Business Profile.
- Agregar direccion o area de servicio.
- Publicar datos consistentes: nombre, telefono, ciudad, pais.

## Tecnico SEO en Next.js

Checklist recomendado:

- `sitemap.ts` con todas las paginas publicas.
- `robots.ts` permitiendo publico y bloqueando privado.
- Metadata unica por pagina.
- Canonical URL por pagina.
- Open Graph para compartir en WhatsApp, Facebook y LinkedIn.
- Imagen OG real del producto o mockup, no solo logo.
- `lang="es"` ya esta correcto.
- Usar `next/image` para imagenes publicas importantes.
- Evitar que contenido SEO importante dependa de componentes client-side.
- Mantener landing y paginas comerciales como Server Components cuando sea posible.
- Medir Core Web Vitals despues de tener contenido real.

## Que no hacer

- No indexar el dashboard privado.
- No abrir productos, ventas o reportes reales a Google.
- No depender solo del dominio `.com.bo`.
- No crear decenas de paginas vacias o repetidas.
- No usar palabras clave forzadas en cada frase.
- No convertir el login en landing.
- No poner precios ocultos si el mercado espera comparar rapido; si el precio depende del cliente, mostrar al menos rangos o "desde".

## Plan de implementacion sugerido

Fase 1: Preparar base SEO

- Definir marca definitiva.
- Elegir dominio principal.
- Decidir si el sitio publico vivira en `marca.com.bo` y la app en `app.marca.com.bo`, o todo en el mismo Next.js.
- Crear landing publica en `/`.
- Cambiar `robots.ts`.
- Mover `noindex` a rutas privadas.
- Agregar `sitemap.ts`.

Fase 2: Paginas comerciales

- Crear `/funcionalidades`.
- Crear `/precios`.
- Crear `/contacto` o `/demo`.
- Crear `/sistema-de-inventario-bolivia`.

Fase 3: Paginas por caso de uso

- Crear pagina para ferreterias.
- Crear pagina para tiendas.
- Crear pagina para almacenes.
- Crear pagina para minimarkets si aplica.

Fase 4: Autoridad y confianza

- Agregar testimonios o casos reales.
- Agregar capturas del producto.
- Agregar preguntas frecuentes.
- Configurar Google Search Console.
- Configurar analytics.
- Crear Google Business Profile si corresponde.

## Recomendacion final

Si este producto se vendera a negocios, si conviene hacer una pagina aparte para mostrar funcionalidades, precios, beneficios y contacto. No necesariamente debe ser otro repositorio; puede estar dentro del mismo `apps/web` usando rutas publicas separadas.

La app actual debe verse como el producto operativo. La web publica debe verse como el canal de venta. Mezclar ambas cosas en el login o en el dashboard seria una mala decision SEO y tambien una mala experiencia comercial.

La mejor arquitectura inicial para este proyecto es:

- `marca.com.bo`: landing, funcionalidades, precios, rubros, contacto.
- `marca.com.bo/login` y `marca.com.bo/dashboard`: acceso privado al software.

Si el producto crece, se puede separar despues:

- `www.marca.com.bo`: marketing.
- `app.marca.com.bo`: aplicacion privada.

Para el estado actual del codigo, recomiendo empezar con la primera opcion porque es mas simple y permite avanzar rapido sin duplicar infraestructura.
