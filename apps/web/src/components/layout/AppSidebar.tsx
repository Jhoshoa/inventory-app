import Link from "next/link";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  ReceiptText,
  ShoppingCart,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pos", label: "POS", icon: ShoppingCart },
  { href: "/dashboard/products", label: "Productos", icon: Boxes },
  { href: "/dashboard/sales", label: "Ventas", icon: ReceiptText },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
] as const;

export function AppSidebar() {
  return (
    <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Link href="/dashboard" className="text-base font-semibold text-slate-950">
          Inventory App
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
