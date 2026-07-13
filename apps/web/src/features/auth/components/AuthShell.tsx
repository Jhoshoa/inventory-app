import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
}

export function AuthShell({
  title,
  description,
  children,
  footerText,
  footerHref,
  footerLinkLabel,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background px-4 py-10 text-text-body">
      <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 shadow-panel">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            App Inventario
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-text-strong">{title}</h1>
          <p className="mt-2 text-sm text-text-muted">{description}</p>
        </div>
        {children}
        <p className="mt-5 text-center text-sm text-text-muted">
          {footerText}{" "}
          <Link
            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-app-surface"
            href={footerHref}
          >
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
