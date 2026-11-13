"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShoppingCart } from "lucide-react";
import type { Session } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { BrandMark } from "@/features/marketing/components/BrandLogo";
import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import { planLine } from "./plan";
import { isNavItemActive, usesNarrowSidebar, visibleNavItems, type NavItem } from "./navigation";
import type { ShellStatus } from "./shellStatus";

function badgeFor(item: NavItem, status: ShellStatus) {
  return item.key === "pedidos" && status.pendingOrders ? status.pendingOrders : null;
}

/**
 * Escritorio (≥ 1024 px): barra completa. Tablet (640–1023 px) y Vender en
 * escritorio: barra angosta con íconos y nombre. En el celular no se muestra:
 * la reemplaza la barra de abajo.
 */
export function AppSidebar({ session, status }: { session: Session; status: ShellStatus }) {
  const pathname = usePathname() ?? "";
  const narrow = usesNarrowSidebar(pathname);
  const items = visibleNavItems(session.role);

  return (
    <>
      <aside
        aria-label="Menú"
        className={`print-hidden fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-4 border-r border-app-border bg-app-surface px-3 py-4 ${
          narrow ? "" : "lg:flex"
        }`}
      >
        <div className="flex items-center gap-2.5 px-1.5">
          <BrandMark size={30} />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-text-strong">{session.storeName}</p>
            {planLine(session) ? <p className="truncate text-xs text-text-muted">{planLine(session)}</p> : null}
          </div>
        </div>
        <Link
          href="/dashboard/pos"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-brand-700 px-4 text-sm font-bold text-text-inverse hover:bg-brand-800"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Nueva venta
          <kbd className="ml-1 rounded border border-white/50 px-1.5 text-[11px] font-semibold opacity-80">F2</kbd>
        </Link>
        <nav aria-label="Principal" data-nav="sidebar" className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            const badge = badgeFor(item, status);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex h-10 items-center gap-3 rounded-[10px] px-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[#EEF0F4] font-bold text-text-strong"
                    : "font-medium text-text-body hover:bg-app-surface-muted hover:text-text-strong"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-700" : "text-text-muted group-hover:text-text-strong"}`}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.label}</span>
                {badge ? (
                  <span className="min-w-5 rounded-full bg-status-danger px-1.5 text-center text-xs font-bold leading-5 text-text-inverse">
                    {badge}
                    <span className="sr-only"> sin responder</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <CashCard session={session} status={status} />
          <div className="flex items-center gap-2 border-t border-app-border px-1.5 pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-strong">{session.fullName || session.email}</p>
              <p className="truncate text-xs text-text-muted">{session.role === "owner" ? "Dueño" : "Cajero"}</p>
            </div>
            <LogoutButton variant="ghost" className="h-9 px-2" aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </LogoutButton>
          </div>
        </div>
      </aside>

      <nav
        aria-label="Principal"
        data-nav="rail"
        className={`print-hidden fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center gap-1.5 overflow-y-auto border-r border-app-border bg-app-surface px-2 py-4 sm:flex ${
          narrow ? "" : "lg:hidden"
        }`}
      >
        <Link href="/dashboard" className="mb-2.5" aria-label={`Inicio de ${session.storeName}`}>
          <BrandMark size={34} />
        </Link>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);
          const badge = badgeFor(item, status);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-14 w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] text-[10px] font-bold leading-none ${
                active ? "bg-brand-50 text-brand-700" : "text-text-muted hover:bg-app-surface-muted hover:text-text-strong"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
              {badge ? (
                <span className="absolute right-2 top-1.5 min-w-[18px] rounded-full border-2 border-app-surface bg-status-danger px-1 text-center text-[10px] font-extrabold leading-[14px] text-text-inverse">
                  {badge}
                  <span className="sr-only"> sin responder</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function CashCard({ session, status }: { session: Session; status: ShellStatus }) {
  if (!status.cash) return null;
  const { isOpen, openedAt, expectedCash } = status.cash;
  const owner = canOpenCloseStore(session.role);
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-app-border p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-text-strong">
        <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-[#12B76A]" : "bg-app-borderStrong"}`} aria-hidden="true" />
        {isOpen ? "Caja abierta" : "Caja cerrada"}
      </p>
      {isOpen && (openedAt || (owner && expectedCash)) ? (
        <p className="text-xs text-text-muted">
          {openedAt ? `Desde ${formatTimeShort(openedAt)}` : null}
          {owner && expectedCash ? `${openedAt ? " · " : ""}Efectivo esperado ${formatCurrency(expectedCash)}` : null}
        </p>
      ) : null}
      {owner ? (
        <Link
          href="/dashboard/caja"
          className="inline-flex h-9 items-center justify-center rounded-[10px] border border-app-borderStrong bg-app-surface text-[13px] font-semibold text-text-body hover:bg-app-surface-muted"
        >
          {isOpen ? "Cerrar caja" : "Abrir caja"}
        </Link>
      ) : null}
    </div>
  );
}
