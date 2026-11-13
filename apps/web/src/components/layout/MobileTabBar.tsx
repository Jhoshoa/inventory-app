"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, House, ReceiptText, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { activeMobileTab, MORE_HREF, MoreIcon, shouldShowMobileTabBar, type MobileTabKey } from "./navigation";

const tabs: Array<{ key: Exclude<MobileTabKey, "vender">; href: string; label: string; icon: LucideIcon }> = [
  { key: "inicio", href: "/dashboard", label: "Inicio", icon: House },
  { key: "productos", href: "/dashboard/products", label: "Productos", icon: Boxes },
  { key: "ventas", href: "/dashboard/sales", label: "Ventas", icon: ReceiptText },
  { key: "mas", href: MORE_HREF, label: "Más", icon: MoreIcon },
];

/**
 * Barra de abajo del celular (< 640 px), igual en todas las pantallas (tablero P00).
 * La página actual lleva fondo detrás del ícono, no solo color. Más queda
 * marcado en todo lo que se abre desde Más, y lleva los pedidos sin responder.
 */
export function MobileTabBar({ pendingOrders }: { pendingOrders: number | null }) {
  const pathname = usePathname() ?? "";
  if (!shouldShowMobileTabBar(pathname)) return null;
  const active = activeMobileTab(pathname);
  const [inicio, productos, ventas, mas] = tabs;

  return (
    <nav
      aria-label="Principal"
      data-nav="tabs"
      className="print-hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-app-border bg-app-surface px-1.5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1.5 sm:hidden"
    >
      <Tab tab={inicio} active={active === inicio.key} />
      <Tab tab={productos} active={active === productos.key} />
      <Link
        href="/dashboard/pos"
        aria-current={active === "vender" ? "page" : undefined}
        className="flex flex-col items-center gap-1 text-[11px] font-bold text-text-strong"
      >
        <span
          className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand-700 shadow-[0_8px_18px_rgba(31,79,216,.35)] ${
            active === "vender" ? "ring-4 ring-brand-100" : ""
          }`}
        >
          <ShoppingCart className="h-[26px] w-[26px] text-text-inverse" aria-hidden="true" />
        </span>
        Vender
      </Link>
      <Tab tab={ventas} active={active === ventas.key} />
      <Tab tab={mas} active={active === mas.key} badge={pendingOrders} />
    </nav>
  );
}

function Tab({
  tab,
  active,
  badge = null,
}: {
  tab: (typeof tabs)[number];
  active: boolean;
  badge?: number | null;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-[11px] ${
        active ? "font-bold text-brand-700" : "font-semibold text-text-muted"
      }`}
    >
      <span
        className={`relative flex h-8 w-[60px] items-center justify-center rounded-full ${active ? "bg-brand-100" : ""}`}
      >
        <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
        {badge ? (
          <span className="absolute -top-1 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-app-surface bg-status-danger px-1 text-[11px] font-extrabold text-text-inverse">
            {badge}
            <span className="sr-only"> pedidos sin responder</span>
          </span>
        ) : null}
      </span>
      {tab.label}
    </Link>
  );
}
