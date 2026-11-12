import type { ReactNode } from "react";

/** Chip de filtro (tableros P01 y P06): negro cuando está elegido. */
export function Chip({
  pressed,
  className = "",
  onClick,
  disabled,
  children,
}: {
  pressed: boolean;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold max-[359px]:px-2.5 max-[359px]:text-xs focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-50 ${
        pressed ? "border-text-strong bg-text-strong text-text-inverse" : "border-app-borderStrong bg-app-surface text-text-body hover:bg-app-surface-muted"
      } ${className}`}
    >
      {children}
    </button>
  );
}
