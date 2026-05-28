import type { HTMLAttributes } from "react";

export function ResponsiveToolbar({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface p-3 shadow-panel sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
      {...props}
    />
  );
}
