import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Ruta de navegacion" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 overflow-hidden text-xs font-medium text-text-muted">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1 || !item.href;
          const href = item.href;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
              {isCurrent || !href ? (
                <span
                  aria-current="page"
                  className="truncate text-text-strong"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="truncate hover:text-text-strong"
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
