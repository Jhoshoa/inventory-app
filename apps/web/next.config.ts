import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { authRewrites } from "./src/lib/auth/publicAuthRoutes";
import { pwaRuntimeCaching } from "./src/lib/pwa/runtimeCaching";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    // Ver src/lib/pwa/runtimeCaching.ts: que se guarda y que va directo a la red.
    runtimeCaching: pwaRuntimeCaching,
  },
  // worker/index.ts: borra la cache vieja al activarse.
  customWorkerSrc: "worker",
});

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  // Categorías y lugares pasaron de Configuración a Productos (Fase 3): enlaces viejos.
  async redirects() {
    return [
      { source: "/dashboard/settings/categorias", destination: "/dashboard/products/categorias", permanent: false },
      { source: "/dashboard/settings/categories", destination: "/dashboard/products/categorias", permanent: false },
      { source: "/dashboard/settings/lugares", destination: "/dashboard/products/lugares", permanent: false },
      { source: "/dashboard/settings/ubicaciones", destination: "/dashboard/products/lugares", permanent: false },
      { source: "/dashboard/settings/locations", destination: "/dashboard/products/lugares", permanent: false },
    ];
  },
  // Enlaces de los correos y Google llegan a APP_URL/auth/v1/...: se reenvian a
  // Supabase Auth en la red interna (ver src/lib/auth/publicAuthRoutes.ts).
  async rewrites() {
    return authRewrites(process.env.AUTH_GATEWAY_URL);
  },
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
