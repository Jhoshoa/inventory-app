"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { canExport, canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { ExpiryAlertDialog } from "./ExpiryAlertDialog";
import { ProductCsvImportDialog } from "./ProductCsvImportDialog";

const EXPORT_HREF = "/api/exports/products";

/**
 * Acciones de la lista (tablero P01). Desde 1024 px: botones y ⋯ junto a
 * "+ Nuevo producto"; entre 640 y 1024 px Etiquetas e Importar pasan al ⋯.
 * En el celular: ⋯ abre "Más acciones" (también Categorías, Lugares en la tienda y
 * Aviso de vencimiento, tablero P01B) y el botón flotante crea el producto.
 * El cajero no tiene acciones.
 */
export function ProductListActions({
  role,
  alertDays = null,
}: {
  role: UserRole;
  /** Aviso de vencimiento de la tienda; null si no se pudo leer (la opción no aparece). */
  alertDays?: number | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  if (!canManageProducts(role)) return null;
  const exportAllowed = canExport(role);

  return (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <Button variant="secondary" className="max-lg:hidden" asChild>
          <Link href="/dashboard/products/labels">Imprimir etiquetas</Link>
        </Button>
        <Button variant="secondary" className="max-lg:hidden" onClick={() => setImportOpen(true)}>
          Importar CSV
        </Button>
        <Menu label="Más acciones de productos" trigger="⋯" triggerClassName="h-control w-[var(--height-control)] text-lg">
          <MenuItem className="lg:hidden" href="/dashboard/products/labels">
            Imprimir etiquetas
          </MenuItem>
          <MenuItem className="lg:hidden" onSelect={() => setImportOpen(true)}>
            Importar CSV
          </MenuItem>
          {exportAllowed ? (
            <MenuItem href={EXPORT_HREF} download>
              Descargar lista (CSV)
            </MenuItem>
          ) : null}
          {alertDays !== null ? <MenuItem onSelect={() => setAlertOpen(true)}>Aviso de vencimiento</MenuItem> : null}
        </Menu>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <button
        type="button"
        aria-label="Más acciones: importar, etiquetas, descargar, categorías y lugares en la tienda"
        aria-haspopup="dialog"
        onClick={() => setSheetOpen(true)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border-2 border-brand-700 bg-brand-50 text-lg font-extrabold text-brand-700 sm:hidden"
      >
        ⋯
      </button>
      <Link
        href="/dashboard/products/new"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-4 z-20 inline-flex h-[52px] items-center gap-2 rounded-2xl bg-brand-700 px-4 text-sm font-bold text-text-inverse shadow-[0_10px_22px_rgba(31,79,216,.35)] sm:hidden"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo producto
      </Link>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen} position="sheet" size="md">
        <DialogTitle close>Más acciones</DialogTitle>
        <DialogBody className="!pb-5">
          <div className="flex flex-col">
            <SheetRow
              onClick={() => {
                setSheetOpen(false);
                setImportOpen(true);
              }}
              hint="Muchos productos de una vez"
            >
              Importar desde CSV
            </SheetRow>
            <SheetRow href="/dashboard/products/labels" hint="QR y precio">
              Imprimir etiquetas
            </SheetRow>
            {exportAllowed ? (
              <SheetRow href={EXPORT_HREF} download hint="Para Excel">
                Descargar lista (CSV)
              </SheetRow>
            ) : null}
            <SheetRow href="/dashboard/products/categorias" hint="Prefijo del SKU">
              Categorías
            </SheetRow>
            <SheetRow href="/dashboard/products/lugares" hint="Pasillo, estante, heladera…">
              Lugares en la tienda
            </SheetRow>
            {alertDays !== null ? (
              <SheetRow
                onClick={() => {
                  setSheetOpen(false);
                  setAlertOpen(true);
                }}
                hint={alertDays === 1 ? "1 día antes" : `${alertDays} días antes`}
              >
                Aviso de vencimiento
              </SheetRow>
            ) : null}
          </div>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setSheetOpen(false)}>
            Cerrar
          </Button>
        </DialogBody>
      </Dialog>

      {alertDays !== null ? <ExpiryAlertDialog open={alertOpen} days={alertDays} onOpenChange={setAlertOpen} /> : null}
      <ProductCsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}

function SheetRow({
  href,
  download = false,
  hint,
  onClick,
  children,
}: {
  href?: string;
  download?: boolean;
  hint: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className =
    "flex min-h-[52px] items-center justify-between gap-3 border-t border-app-border px-1 text-left text-[15px] font-semibold text-text-strong first:border-t-0 hover:bg-app-surface-muted";
  const content = (
    <>
      {children}
      <span className="text-[13px] font-normal text-text-muted">{hint}</span>
    </>
  );
  if (href && download) {
    return (
      <a href={href} download className={className}>
        {content}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
