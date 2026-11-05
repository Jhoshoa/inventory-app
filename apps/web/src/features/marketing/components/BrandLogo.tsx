import { BRAND } from "@/lib/brand";

/** La boleta sonriente del logo. */
export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} className="shrink-0">
      <path
        d="M11 5H37Q40 5 40 8V39L36 43L32 39L28 43L24 39L20 43L16 39L12 43L8 39V8Q8 5 11 5Z"
        fill="#FFE14D"
        stroke="#111111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="18" r="2.8" fill="#111111" />
      <circle cx="29" cy="18" r="2.8" fill="#111111" />
      <path d="M17 25Q24 31 31 25" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Logo con el nombre de marca. Un nombre "Tu X" se compone como en el diseño
 * ("tu" chico en mono encima de "X" en mayusculas); cualquier otro nombre que
 * se configure por NEXT_PUBLIC_BRAND_NAME se muestra entero.
 */
export function BrandLogo({ size = 42, compact = false }: { size?: number; compact?: boolean }) {
  const match = /^(tu)\s+(.+)$/i.exec(BRAND.name);

  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={size} />
      {match && !compact ? (
        <span>
          <span className="block font-receipt text-xs font-bold leading-none">{match[1].toLowerCase()}</span>
          <span className="block font-display text-xl uppercase leading-none">{match[2]}</span>
        </span>
      ) : (
        <span className="font-display text-lg uppercase leading-none">{BRAND.name}</span>
      )}
    </span>
  );
}
