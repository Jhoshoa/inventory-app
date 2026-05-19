import type { HTMLAttributes } from "react";

const variants = {
  info: "border-slate-200 bg-white text-slate-700",
  error: "border-red-200 bg-red-50 text-red-700",
} as const;

export function Alert({
  className = "",
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
