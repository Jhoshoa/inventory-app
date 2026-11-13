"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import type { LabelDimensions, ProductLabelSettings } from "../label-settings";
import { generateQrSvg, svgToDataUri } from "../qr";
import type { Product } from "../types";
import { ProductLabelCard } from "./ProductLabelCard";

export interface SelectedLabelProduct {
  product: Product;
  quantity: number;
}

export function ProductLabelPreview({
  selectedProducts,
  settings,
  dimensions,
  sheets,
}: {
  selectedProducts: SelectedLabelProduct[];
  settings: ProductLabelSettings;
  dimensions: LabelDimensions;
  /** Hojas que ocupan (para "Vista previa · 2 hojas"). */
  sheets?: number;
}) {
  const [qrByCode, setQrByCode] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printableItems = useMemo(
    () =>
      selectedProducts.flatMap((item) =>
        Array.from({ length: item.quantity }, (_, index) => ({
          key: `${item.product.id}-${index}`,
          product: item.product,
        })),
      ),
    [selectedProducts],
  );

  const codes = useMemo(
    () =>
      Array.from(
        new Set(
          selectedProducts
            .map((item) => item.product.qr_code?.trim())
            .filter((code): code is string => Boolean(code)),
        ),
      ),
    [selectedProducts],
  );

  useEffect(() => {
    if (codes.length === 0) {
      setQrByCode({});
      setError(null);
      setIsGenerating(false);
      return;
    }

    let isCurrent = true;
    setIsGenerating(true);
    setError(null);

    Promise.all(
      codes.map(async (code) => {
        const svg = await generateQrSvg(code, 160);
        return [code, svgToDataUri(svg)] as const;
      }),
    )
      .then((entries) => {
        if (isCurrent) setQrByCode(Object.fromEntries(entries));
      })
      .catch(() => {
        if (isCurrent) setError("No se pudieron generar algunas etiquetas.");
      })
      .finally(() => {
        if (isCurrent) setIsGenerating(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [codes]);

  return (
    <section className="space-y-3">
      <style>
        {`@media print { @page { size: ${settings.pageSize}; margin: ${dimensions.marginMm}mm; } }`}
      </style>
      <div className="print-hidden flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-text-strong">
            Vista previa{sheets ? ` · ${sheets === 1 ? "1 hoja" : `${sheets} hojas`}` : ""}
          </h2>
          <p className="text-sm text-text-muted">
            {printableItems.length === 1 ? "1 etiqueta lista" : `${printableItems.length} etiquetas listas`} para imprimir.
          </p>
        </div>
        {isGenerating ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Generando QR…
          </div>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="print-label-sheet min-h-72 overflow-x-auto rounded-card border border-app-border bg-app-surface p-4">
        {printableItems.length === 0 ? (
          <div className="print-hidden flex h-72 items-center justify-center text-sm text-text-muted">
            Elige productos con código para ver las etiquetas.
          </div>
        ) : (
          <div
            className="label-grid"
            style={{
              gridTemplateColumns: `repeat(${Math.max(dimensions.columns, 1)}, ${dimensions.labelWidthMm}mm)`,
              gap: `${dimensions.gapMm}mm`,
            }}
          >
            {printableItems.map((item) => {
              const code = item.product.qr_code?.trim() ?? "";
              return (
                <ProductLabelCard
                  key={item.key}
                  product={item.product}
                  qrSrc={qrByCode[code] ?? ""}
                  settings={settings}
                  dimensions={dimensions}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
