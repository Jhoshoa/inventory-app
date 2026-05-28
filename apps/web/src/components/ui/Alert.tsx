import type { HTMLAttributes } from "react";

const variants = {
  info: "border-status-infoBorder bg-status-infoBg text-status-info",
  success: "border-status-successBorder bg-status-successBg text-status-success",
  warning: "border-status-warningBorder bg-status-warningBg text-status-warning",
  error: "border-status-dangerBorder bg-status-dangerBg text-status-danger",
} as const;

export function Alert({
  className = "",
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm font-medium shadow-sm ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
