import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  basePath,
  searchParams,
  total,
  limit,
  offset,
  onNavigate,
}: {
  basePath?: string;
  searchParams?: URLSearchParams;
  total: number;
  limit: number;
  offset: number;
  onNavigate?: (offset: number) => void;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const previousOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;
  const hasPrevious = offset > 0;
  const hasNext = nextOffset < total;

  return (
    <div className="flex flex-col gap-3 border-t border-app-border bg-app-surface px-4 py-3 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando {from}-{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        {onNavigate ? (
          <>
            <Button
              variant="secondary"
              type="button"
              disabled={!hasPrevious}
              onClick={() => onNavigate(previousOffset)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Anterior
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={!hasNext}
              onClick={() => onNavigate(nextOffset)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        ) : (
          <>
            <PageLink
              disabled={!hasPrevious}
              href={hrefFor(basePath!, searchParams!, previousOffset)}
              label="Anterior"
              icon="previous"
            />
            <PageLink
              disabled={!hasNext}
              href={hrefFor(basePath!, searchParams!, nextOffset)}
              label="Siguiente"
              icon="next"
            />
          </>
        )}
      </div>
    </div>
  );
}

function PageLink({
  disabled,
  href,
  label,
  icon,
}: {
  disabled: boolean;
  href: string;
  label: string;
  icon: "previous" | "next";
}) {
  const content = (
    <>
      {icon === "previous" ? <ChevronLeft className="h-4 w-4" aria-hidden /> : null}
      {label}
      {icon === "next" ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
    </>
  );

  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center gap-1 rounded-md border border-app-border px-3 text-text-disabled">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1 rounded-md border border-app-borderStrong px-3 text-text-body hover:bg-app-surface-muted hover:text-text-strong"
    >
      {content}
    </Link>
  );
}

function hrefFor(basePath: string, searchParams: URLSearchParams, offset: number) {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set("offset", offset.toString());
  return `${basePath}?${nextParams.toString()}`;
}
