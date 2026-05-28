import type { HTMLAttributes } from "react";

export function ResponsiveActions({
  align = "end",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }) {
  const alignment = align === "start" ? "sm:justify-start" : "sm:justify-end";

  return (
    <div
      className={`flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap ${alignment} ${className}`}
      {...props}
    />
  );
}
