"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/** "Categorias" de las pestanas: se cierra al elegir, al tocar afuera o con Escape. */
export function CategoryMenu({
  items,
  summaryClassName,
}: {
  items: Array<{ id: string; name: string; count: number; href: string }>;
  summaryClassName: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(event: Event) {
      const details = ref.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !details.contains(event.target as Node)) {
        details.open = false;
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary className={`${summaryClassName} flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden`}>
        Categorías
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-1 w-64 border-2 border-sf-ink bg-white p-2 shadow-[6px_6px_0_var(--sf-ink)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => {
              if (ref.current) ref.current.open = false;
            }}
            className="flex justify-between px-3 py-3 text-[15px] font-semibold text-sf-ink hover:bg-sf-paper"
          >
            <span>{item.name}</span>
            <span className="font-receipt text-[13px] text-sf-muted">{item.count}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
