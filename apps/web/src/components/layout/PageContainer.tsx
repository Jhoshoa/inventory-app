import type { HTMLAttributes } from "react";

export function PageContainer({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={`mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 ${className}`}
      {...props}
    />
  );
}
