import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border border-slate-200 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4">
        <span>
          <span className="block text-base font-semibold text-slate-950">{title}</span>
          {description ? <span className="mt-1 block text-sm text-slate-600">{description}</span> : null}
        </span>
        <ChevronDown
          className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">{children}</div>
    </details>
  );
}
