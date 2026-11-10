"use client";

import { createContext, type MouseEvent, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CatalogNavigationValue {
  /** Cambia la URL del catalogo sin recargar ni subir al principio. */
  navigate: (href: string, options?: { replace?: boolean }) => void;
  isPending: boolean;
}

const CatalogNavigationContext = createContext<CatalogNavigationValue | null>(null);

// Si por algo la navegacion no termina, no dejar la grilla atenuada para siempre.
const PENDING_TIMEOUT_MS = 8000;

/**
 * Busqueda, categorias y orden del catalogo como navegacion del lado del
 * cliente: el servidor manda solo la pagina nueva y React cambia lo que
 * difiere (los productos); el encabezado, la boleta y el scroll se quedan.
 *
 * "Buscando" es la URL pedida que todavia no es la actual. No se envuelve
 * router.push en startTransition: con las precargas de los productos en
 * curso esa transicion podia quedar suspendida y la busqueda no se aplicaba.
 */
export function CatalogNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const current = query ? `${pathname}?${query}` : pathname;
  const [requested, setRequested] = useState<string | null>(null);

  useEffect(() => {
    if (requested === null) return;
    if (requested === current) {
      setRequested(null);
      return;
    }
    const timeout = window.setTimeout(() => setRequested(null), PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [requested, current]);

  const navigate = useCallback(
    (href: string, options: { replace?: boolean } = {}) => {
      setRequested(href);
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router],
  );

  return (
    <CatalogNavigationContext.Provider value={{ navigate, isPending: requested !== null && requested !== current }}>
      {children}
    </CatalogNavigationContext.Provider>
  );
}

export function useCatalogNavigation(): CatalogNavigationValue | null {
  return useContext(CatalogNavigationContext);
}

/** Los productos: atenuados mientras se carga una busqueda o categoria nueva. */
export function CatalogResults({ children, className = "" }: { children: ReactNode; className?: string }) {
  const navigation = useCatalogNavigation();
  const pending = navigation?.isPending ?? false;
  return (
    <div aria-busy={pending} className={`transition-opacity duration-150 ${pending ? "pointer-events-none opacity-50" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Link del catalogo (chips de categoria): navega sin recargar ni mover el scroll. */
export function CatalogLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
}) {
  const navigation = useCatalogNavigation();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!navigation || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigation.navigate(href);
  }

  return (
    <Link href={href} scroll={false} onClick={onClick} className={className} {...rest}>
      {children}
    </Link>
  );
}
