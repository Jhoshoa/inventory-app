import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inventory App",
    short_name: "Inventory",
    description: "Inventario, ventas, reportes e importacion asistida.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
  };
}
