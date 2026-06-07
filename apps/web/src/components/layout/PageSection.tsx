import type { HTMLAttributes } from "react";

export function PageSection({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={`space-y-4 ${className}`} {...props} />;
}
