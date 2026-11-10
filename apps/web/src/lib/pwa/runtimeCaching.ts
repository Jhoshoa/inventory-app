/** Lo que Workbox le pasa a cada regla (solo lo que usamos). */
interface RouteMatch {
  url: URL;
  request: Request;
  sameOrigin: boolean;
}

interface CachingRule {
  urlPattern: (match: RouteMatch) => boolean;
  handler: "NetworkOnly" | "NetworkFirst" | "CacheFirst";
  options?: {
    cacheName: string;
    networkTimeoutSeconds?: number;
    expiration?: { maxEntries: number; maxAgeSeconds: number };
  };
}

/**
 * Que guarda el service worker, y que no.
 *
 * Antes una regla /.*\/ con StaleWhileRevalidate atrapaba todo, tambien las
 * imagenes de res.cloudinary.com: el service worker las pedia con fetch(), que
 * la CSP (connect-src 'self', tambien aplicada a sw.js) bloquea, y el navegador
 * mostraba la imagen rota (NS_ERROR_INTERCEPTION_FAILED en Firefox). Ademas
 * guardaba sin limite cada imagen y cada pagina, incluido el catalogo publico,
 * que podia mostrarse con precios viejos.
 *
 * Ahora solo maneja lo propio y lo que sirve sin conexion; lo demas
 * (otros dominios, el catalogo publico, la API, los datos de navegacion de Next)
 * va directo a la red sin pasar por el.
 *
 * Las funciones se copian como texto dentro de sw.js: no pueden usar nada de
 * afuera de su propio cuerpo.
 */
export const pwaRuntimeCaching: CachingRule[] = [
  {
    // La API nunca desde cache: el offline de datos lo maneja IndexedDB.
    urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
    handler: "NetworkOnly",
  },
  {
    // JS/CSS de Next: su nombre cambia con cada version, se pueden guardar para siempre.
    urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
    handler: "CacheFirst",
    options: {
      cacheName: "next-static",
      expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
    },
  },
  {
    urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "font",
    handler: "CacheFirst",
    options: {
      cacheName: "fonts",
      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
    },
  },
  {
    // Paginas del panel: red primero, y la ultima version guardada si no hay
    // conexion. El catalogo publico (/t/...) no: siempre fresco desde la red.
    urlPattern: ({ request, url, sameOrigin }) =>
      sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/t/"),
    handler: "NetworkFirst",
    options: {
      cacheName: "pages",
      networkTimeoutSeconds: 4,
      expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
    },
  },
];
