"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { generateQrSvg, svgToDataUri } from "../qr";
import type { Product } from "../types";
import { ProductLabelCard } from "./ProductLabelCard";

export interface SelectedLabelProduct {
  product: Product;
  quantity: number;
}

export function ProductLabelPreview({
  selectedProducts,
  showPrice,
}: {
  selectedProducts: SelectedLabelProduct[];
  showPrice: boolean;
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
      <div className="print-hidden flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Vista previa</h2>
          <p className="text-sm text-slate-600">{printableItems.length} etiquetas listas para imprimir.</p>
        </div>
        {isGenerating ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Generando QR
          </div>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="print-label-sheet min-h-96 rounded-lg border border-slate-200 bg-white p-4">
        {printableItems.length === 0 ? (
          <div className="print-hidden flex h-72 items-center justify-center text-sm text-slate-600">
            Selecciona productos con codigo escaneable para previsualizar etiquetas.
          </div>
        ) : (
          <div className="label-grid">
            {printableItems.map((item) => {
              const code = item.product.qr_code?.trim() ?? "";
              return (
                <ProductLabelCard
                  key={item.key}
                  product={item.product}
                  qrSrc={qrByCode[code] ?? ""}
                  showPrice={showPrice}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
