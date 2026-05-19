import type { HTMLAttributes } from "react";

export function DialogSurface({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-lg ${className}`}
      {...props}
    />
  );
}
