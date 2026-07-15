"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readErrorMessage } from "@/lib/api/errors";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Pagination } from "@/components/ui/Pagination";
import { buildSalesApiQuery } from "../schemas";
import type { SaleListResponse, SaleSearchParams } from "../types";
import { SalesDateFilter } from "./SalesDateFilter";
import { SalesTable } from "./SalesTable";

export function SalesBrowser({
  initialSearchParams,
  initialData,
  firstBusinessDate,
}: {
  initialSearchParams: SaleSearchParams & { from_date: string; to_date: string };
  initialData: SaleListResponse;
  firstBusinessDate: string | null;
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const loadedKeyRef = useRef("");

  const fromDate = searchParams.get("from_date");
  const toDate = searchParams.get("to_date");
  const status = searchParams.get("status");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  const currentParams: SaleSearchParams = {
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    status: (status as SaleSearchParams["status"]) ?? "all",
    limit: limit ? Number(limit) : initialSearchParams.limit,
    offset: offset ? Number(offset) : 0,
  };

  const currentKey = `${fromDate ?? ""}|${toDate ?? ""}|${status ?? ""}|${limit ?? ""}|${offset ?? ""}`;
  const isLoading = mountedRef.current && loadedKeyRef.current !== currentKey;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadedKeyRef.current = currentKey;
      return;
    }

    const controller = new AbortController();
    setError(null);

    fetch(`/api/sales?${buildSalesApiQuery(currentParams)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudieron cargar las ventas"));
        return response.json() as Promise<SaleListResponse>;
      })
      .then((result) => {
        loadedKeyRef.current = currentKey;
        setData(result);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        loadedKeyRef.current = currentKey;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las ventas");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, status, limit, offset]);

  return (
    <>
      <SalesDateFilter
        params={{
          ...currentParams,
          from_date: currentParams.from_date ?? data.from_date,
          to_date: currentParams.to_date ?? data.to_date,
        }}
        firstBusinessDate={firstBusinessDate}
      />

      {error ? (
        <DataFetchError resource="las ventas" error={error} />
      ) : isLoading ? (
        <InlineTableSkeleton />
      ) : (
        <div className="rounded-lg border border-app-border bg-app-surface shadow-panel">
          <SalesTable sales={data.items} />
          <Pagination
            basePath="/dashboard/sales"
            searchParams={new URLSearchParams(
              Object.entries(buildParamEntries(currentParams)).filter(([, v]) => v !== undefined && v !== null && v !== ""),
            )}
            total={data.total}
            limit={data.limit}
            offset={data.offset}
          />
        </div>
      )}
    </>
  );
}

function buildParamEntries(params: SaleSearchParams): Record<string, string> {
  const entries: Record<string, string> = {};
  if (params.from_date) entries.from_date = params.from_date;
  if (params.to_date) entries.to_date = params.to_date;
  if (params.status && params.status !== "all") entries.status = params.status;
  entries.limit = String(params.limit);
  entries.offset = String(params.offset);
  return entries;
}

const SALE_HEADERS = ["Fecha", "Estado", "Metodo", "Artículos", "Total", "Acciones"];

function InlineTableSkeleton() {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface shadow-panel">
      <table className="w-full">
        <thead>
          <tr className="border-b border-app-border">
            {SALE_HEADERS.map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                <span className="block h-3 w-16 animate-pulse rounded bg-app-surface-muted" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-app-border last:border-b-0">
              {Array.from({ length: 6 }, (_, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  <span
                    className={`block h-4 animate-pulse rounded bg-app-surface-muted ${
                      cellIndex === 0 ? "w-28" : cellIndex === 1 ? "w-20" : cellIndex === 5 ? "w-9" : "w-16"
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-app-border px-4 py-3">
        <span className="h-4 w-48 animate-pulse rounded bg-app-border" />
        <div className="flex gap-1">
          {Array.from({ length: 2 }, (_, index) => (
            <span key={index} className="block h-8 w-20 animate-pulse rounded-md bg-app-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}


