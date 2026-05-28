import Link from "next/link";
import type { DashboardScope } from "../types";

const scopes: Array<{ value: DashboardScope; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "month", label: "Mes" },
];

export function DashboardScopeTabs({ scope }: { scope: DashboardScope }) {
  return (
    <div className="inline-flex rounded-md border border-app-border bg-app-surface p-1 shadow-panel">
      {scopes.map((item) => {
        const active = item.value === scope;
        return (
          <Link
            key={item.value}
            href={`/dashboard?scope=${item.value}`}
            className={`inline-flex h-8 items-center rounded px-3 text-sm font-medium ${
              active
                ? "bg-brand-700 text-text-inverse shadow-sm"
                : "text-text-muted hover:bg-app-surface-muted hover:text-text-strong"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
