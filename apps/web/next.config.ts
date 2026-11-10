import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
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
