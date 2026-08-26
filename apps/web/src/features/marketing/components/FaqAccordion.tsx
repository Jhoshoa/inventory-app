import { ChevronDown } from "lucide-react";
import type { FaqItem } from "../data";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface shadow-panel">
      {items.map((item) => (
        <details key={item.question} className="group p-4 sm:p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-text-strong marker:content-none">
            {item.question}
            <ChevronDown
              className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-text-body">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
