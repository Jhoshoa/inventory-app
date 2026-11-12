import Link from "next/link";

/** Chips de filtro como enlaces (la página se vuelve a pedir con el filtro en la dirección). */
export function FilterLinks({
  label,
  options,
  active,
  hrefFor,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const current = option.value === active;
          return (
            <li key={option.value}>
              <Link
                href={hrefFor(option.value)}
                scroll={false}
                aria-current={current ? "true" : undefined}
                className={`inline-flex h-[34px] items-center whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-focus max-[359px]:px-2.5 max-[359px]:text-xs ${
                  current ? "border-text-strong bg-text-strong text-text-inverse" : "border-app-borderStrong bg-app-surface text-text-body hover:bg-app-surface-muted"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
