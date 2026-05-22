import Link from "next/link";
import type { DashboardScope } from "../types";

const scopes: Array<{ value: DashboardScope; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "month", label: "Mes" },
];

export function DashboardScopeTabs({ scope }: { scope: DashboardScope }) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
      {scopes.map((item) => {
        const active = item.value === scope;
        return (
          <Link
            key={item.value}
            href={`/dashboard?scope=${item.value}`}
            className={`inline-flex h-8 items-center rounded px-3 text-sm font-medium ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
