"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** F2 = Nueva venta, desde cualquier página del panel (escritorio). */
export function ShortcutKeys() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F2" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      if (pathname !== "/dashboard/pos") router.push("/dashboard/pos");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return null;
}
