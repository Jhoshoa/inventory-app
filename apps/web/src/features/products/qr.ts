export async function generateQrSvg(value: string, size = 240): Promise<string> {
  const normalizedValue = value.trim();
  if (!normalizedValue) throw new Error("Codigo escaneable requerido");

  const QRCode = await import("qrcode");
  return QRCode.toString(normalizedValue, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: size,
  });
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function toQrFilename(code: string) {
  return code.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "producto";
}
