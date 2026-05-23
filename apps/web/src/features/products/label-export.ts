import type { LabelDimensions, ProductLabelSettings } from "./label-settings";
import { generateQrSvg } from "./qr";
import type { Product } from "./types";
import type { SelectedLabelProduct } from "./components/ProductLabelPreview";

export async function exportLabelSheetSvg({
  selectedProducts,
  settings,
  dimensions,
}: {
  selectedProducts: SelectedLabelProduct[];
  settings: ProductLabelSettings;
  dimensions: LabelDimensions;
}) {
  const items = selectedProducts.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, index) => ({
      key: `${item.product.id}-${index}`,
      product: item.product,
    })),
  );
  if (items.length === 0) return;

  const codes = Array.from(
    new Set(
      items
        .map((item) => item.product.qr_code?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  );
  const qrEntries = await Promise.all(
    codes.map(async (code) => [code, await generateQrSvg(code, 160)] as const),
  );
  const qrByCode = Object.fromEntries(qrEntries);
  const columns = Math.max(dimensions.columns, 1);
  const rows = Math.max(Math.ceil(items.length / columns), 1);
  const width = columns * dimensions.labelWidthMm + (columns - 1) * dimensions.gapMm;
  const height = rows * dimensions.labelHeightMm + (rows - 1) * dimensions.gapMm;

  const labels = items
    .map((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = column * (dimensions.labelWidthMm + dimensions.gapMm);
      const y = row * (dimensions.labelHeightMm + dimensions.gapMm);
      const code = item.product.qr_code?.trim() ?? "";
      return renderLabelSvg({
        product: item.product,
        qrSvg: qrByCode[code] ?? "",
        settings,
        dimensions,
        x,
        y,
      });
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">${labels}</svg>`;
  downloadSvg(svg, "etiquetas-productos.svg");
}

function renderLabelSvg({
  product,
  qrSvg,
  settings,
  dimensions,
  x,
  y,
}: {
  product: Product;
  qrSvg: string;
  settings: ProductLabelSettings;
  dimensions: LabelDimensions;
  x: number;
  y: number;
}) {
  const code = product.qr_code?.trim() ?? "";
  const isCompact = dimensions.labelHeightMm <= 10;
  const fontSize = isCompact ? 1.25 : 2.1;
  const smallFontSize = isCompact ? 1.05 : 1.7;
  const textX = x + dimensions.paddingMm + dimensions.qrSizeMm + Math.max(dimensions.paddingMm, 1);
  const qrX = x + dimensions.paddingMm;
  const qrY = y + dimensions.paddingMm;
  let textY = y + dimensions.paddingMm + fontSize;
  const lines: string[] = [];

  function addLine(value: string, size = smallFontSize, weight = "400") {
    lines.push(
      `<text x="${textX}" y="${textY}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`,
    );
    textY += size + (isCompact ? 0.25 : 0.55);
  }

  if (settings.showName) addLine(product.name, fontSize, "700");
  if (settings.showCode) addLine(`Cod: ${code}`);
  if (settings.showSku && product.sku) addLine(`SKU: ${product.sku}`);
  if (settings.showCategory && product.category) addLine(product.category);
  if (settings.showPrice) addLine(`Bs. ${product.price}`, fontSize, "700");

  return `<g><rect x="${x}" y="${y}" width="${dimensions.labelWidthMm}" height="${dimensions.labelHeightMm}" fill="#fff" stroke="#cbd5e1" stroke-width="0.15"/>${positionQrSvg(qrSvg, qrX, qrY, dimensions.qrSizeMm)}${lines.join("")}</g>`;
}

function positionQrSvg(svg: string, x: number, y: number, size: number) {
  if (!svg) return "";
  return svg
    .replace(/<\?xml[^>]*>/, "")
    .replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
      const cleanAttrs = attrs.replace(/\s(?:x|y|width|height)="[^"]*"/g, "");
      return `<svg x="${x}" y="${y}" width="${size}" height="${size}"${cleanAttrs}>`;
    });
}

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
