import { LogOut, Store } from "lucide-react";
import type { Session } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

export function AppHeader({ session }: { session: Session }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
            <Store className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span className="truncate">{session.storeName}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {session.email} - {session.role}
          </p>
        </div>
        <LogoutButton>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Salir
        </LogoutButton>
      </div>
    </header>
  );
}
