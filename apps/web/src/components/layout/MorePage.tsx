import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import type { Session } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { canOpenCloseStore, isOwner } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
import { planLine } from "./plan";
import { moreNavItems, type NavKey } from "./navigation";
import type { ShellStatus } from "./shellStatus";

const hints: Record<NavKey, { owner: string; cashier: string }> = {
  inicio: { owner: "", cashier: "" },
  vender: { owner: "", cashier: "" },
  productos: { owner: "", cashier: "" },
  ventas: { owner: "", cashier: "" },
  caja: { owner: "Abrir, cerrar y movimientos de efectivo", cashier: "Ver si la caja está abierta" },
  pedidos: { owner: "Lo que te piden desde el catálogo", cashier: "Lo que te piden desde el catálogo" },
  reportes: { owner: "Ventas, cierres de caja y descargas", cashier: "Ventas y movimientos de stock" },
  configuracion: { owner: "Tienda, precios, catálogo y equipo", cashier: "" },
};

/** Pantalla Más del celular (tablero "A · Menú Más"). En escritorio también funciona como índice. */
export function MorePage({ session, status }: { session: Session; status: ShellStatus }) {
  const owner = isOwner(session.role);
  const items = moreNavItems(session.role).filter((item) => item.key !== "caja");
  const cash = status.cash;
  const plan = planLine(session);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-strong">Más</h1>

      <Link
        href="/dashboard/caja"
        className="flex items-center gap-3 rounded-card border border-app-border bg-app-surface p-4 hover:bg-app-surface-muted"
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${cash?.isOpen ? "bg-[#12B76A]" : "bg-app-borderStrong"}`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-text-strong">
            {cash ? (cash.isOpen ? "Caja abierta" : "Caja cerrada") : "Caja"}
          </span>
          <span className="block text-[13px] text-text-muted">
            {cash?.isOpen && cash.openedAt ? `Desde ${formatTimeShort(cash.openedAt)}` : null}
            {cash?.isOpen && owner && cash.expectedCash
              ? `${cash.openedAt ? " · " : ""}Efectivo esperado ${formatCurrency(cash.expectedCash)}`
              : null}
            {!cash?.isOpen ? (canOpenCloseStore(session.role) ? "Ábrela para empezar a vender" : "El dueño la abre para vender") : null}
          </span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] text-text-disabled" aria-hidden="true" />
      </Link>

      <ul className="overflow-hidden rounded-card border border-app-border bg-app-surface">
        {items.map((item, index) => {
          const Icon = item.icon;
          const hint = owner ? hints[item.key].owner : hints[item.key].cashier;
          const badge = item.key === "pedidos" && status.pendingOrders ? status.pendingOrders : null;
          return (
            <li key={item.href} className={index > 0 ? "border-t border-[#F2F4F7]" : ""}>
              <Link href={item.href} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-app-surface-muted">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-700">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-text-strong">{item.label}</span>
                  {hint ? <span className="block text-xs text-text-muted">{hint}</span> : null}
                </span>
                {badge ? (
                  <span className="rounded-full bg-status-danger px-2 text-xs font-extrabold leading-5 text-text-inverse">
                    {badge}
                    <span className="sr-only"> sin responder</span>
                  </span>
                ) : null}
                <ChevronRight className="h-[18px] w-[18px] text-text-disabled" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      <section aria-label="Tu cuenta" className="flex flex-col gap-3 rounded-card border border-app-border bg-app-surface p-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-text-strong">{session.fullName || session.email}</p>
          <p className="truncate text-[13px] text-text-muted">
            {session.fullName ? `${session.email} · ` : ""}
            {owner ? "Dueño" : "Cajero"} de {session.storeName}
          </p>
          {plan ? <p className="mt-0.5 text-xs font-semibold text-status-warning">{plan}</p> : null}
        </div>
        <LogoutButton className="w-full">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </LogoutButton>
      </section>
    </div>
  );
}
