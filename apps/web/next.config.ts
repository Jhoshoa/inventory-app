import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    // El shell de la app (JS/CSS/fuentes) se cachea para que cargue al
    // instante en visitas repetidas, incluso sin red. Las llamadas a la API
    // (backend y rutas /api/*) nunca se sirven desde cache: el offline real
    // de datos (productos, ventas) lo maneja IndexedDB, no el service worker.
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /.*/,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "app-shell" },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
