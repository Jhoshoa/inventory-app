import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

const PUBLIC_ROUTES = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/funcionalidades", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/precios", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/contacto", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/legal/terminos", changeFrequency: "yearly" as const, priority: 0.2 },
  { path: "/legal/privacidad", changeFrequency: "yearly" as const, priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${BRAND.siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
