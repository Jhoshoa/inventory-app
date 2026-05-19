"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductSearchParams } from "../types";

export function ProductFilters({ params }: { params: ProductSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(params.q ?? "");
  const [, startTransition] = useTransition();

  const updateParam = useCallback((name: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(name, value);
    else next.delete(name);
    next.set("offset", "0");

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }, [pathname, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentQuery = new URLSearchParams(window.location.search).get("q") ?? "";
      if (query === currentQuery) return;
      updateParam("q", query || null);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query, updateParam]);

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_160px_160px_160px]">
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, SKU o QR"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <Select
        aria-label="Filtro de stock"
        value={params.stock}
        onChange={(event) => updateParam("stock", event.target.value)}
      >
        <option value="all">Todo stock</option>
        <option value="available">Disponible</option>
        <option value="low">Stock bajo</option>
        <option value="out">Sin stock</option>
      </Select>
      <Select
        aria-label="Ordenar por"
        value={params.sort}
        onChange={(event) => updateParam("sort", event.target.value)}
      >
        <option value="name">Nombre</option>
        <option value="stock">Stock</option>
        <option value="price">Precio</option>
        <option value="updated_at">Actualizado</option>
      </Select>
      <Select
        aria-label="Direccion"
        value={params.direction}
        onChange={(event) => updateParam("direction", event.target.value)}
      >
        <option value="asc">Ascendente</option>
        <option value="desc">Descendente</option>
      </Select>
    </div>
  );
}
