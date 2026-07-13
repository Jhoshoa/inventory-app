import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "App Inventario",
    short_name: "App Inventario",
    description: "Inventario, ventas, reportes e importacion asistida.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
  };
}
