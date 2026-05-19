import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
      {...props}
    />
  );
}
