import { initials, storefrontTheme, type StorefrontTemplate } from "@/features/storefront/settings";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const TILES = ["#FFE9A3", "#C4D7FF", "#F1EDE3", "#BDEFD9"];

/** Un celular con la plantilla elegida y los colores que el dueno esta editando. */
export function StorefrontPreview({
  template,
  storeName,
  logoUrl,
  colorPrimary,
  colorSticker,
  announcement,
}: {
  template: StorefrontTemplate;
  storeName: string;
  logoUrl: string | null;
  colorPrimary: string;
  colorSticker: string;
  announcement: string | null;
}) {
  const theme = storefrontTheme({
    color_primary: HEX_RE.test(colorPrimary) ? colorPrimary : null,
    color_secondary: HEX_RE.test(colorSticker) ? colorSticker : null,
    settings: { template },
  });
  const logo = (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-[#111111] bg-white text-[#111111]"
      style={{ width: 36, height: 36, fontSize: 13, fontWeight: 800 }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen remota de la tienda, sin loader configurado
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(storeName)
      )}
    </span>
  );

  return (
    <div
      role="img"
      aria-label={`Vista previa de la plantilla ${template === "lista" ? "Lista de precios" : "Vitrina"}`}
      className="mx-auto h-[440px] w-[220px] overflow-hidden rounded-[28px] shadow-[0_0_0_7px_#111111]"
      style={{ backgroundColor: template === "lista" ? theme.primary : "#F5F3EE" }}
    >
      <div className="h-3" />
      {announcement ? (
        <div
          className="truncate border-b-[1.5px] border-[#111111] px-2 py-1 text-center text-[8px] font-bold uppercase"
          style={{ backgroundColor: theme.sticker, color: theme.onSticker }}
        >
          ★ {announcement} ★
        </div>
      ) : null}

      {template === "vitrina" ? (
        <>
          <div
            className="flex items-center gap-2.5 border-b-[1.5px] border-[#111111] px-3 py-3"
            style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
          >
            {logo}
            <span className="truncate text-sm font-black uppercase">{storeName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2.5">
            {TILES.map((tile, index) => (
              <div key={tile + index} className="flex h-[110px] flex-col border-[1.5px] border-[#111111] bg-white">
                <div className="relative h-14 border-b-[1.5px] border-[#111111]" style={{ backgroundColor: tile }}>
                  <span
                    className="absolute -bottom-3 right-1 flex h-8 w-8 rotate-[8deg] items-center justify-center rounded-full border-[1.5px] border-[#111111] text-[8px] font-black"
                    style={{ backgroundColor: theme.sticker, color: theme.onSticker }}
                  >
                    {[18, 7, 8, 14][index]},00
                  </span>
                </div>
                <div className="mt-auto p-1.5">
                  <div className="h-4 bg-[#111111]" />
                </div>
              </div>
            ))}
          </div>
          <div className="mx-2.5 rounded-lg bg-[#111111] px-2.5 py-2 text-[10px] font-bold" style={{ color: theme.stickerOnDark }}>
            TU BOLETA · Bs 34,00
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ color: theme.onPrimary }}>
            {logo}
            <span className="truncate text-xs font-black uppercase">{storeName}</span>
          </div>
          <div className="mx-3 bg-white px-3 py-3 text-[#111111]">
            <p className="truncate text-center text-sm font-black uppercase">{storeName}</p>
            <p className="text-center text-[7px] font-bold">LISTA DE PRECIOS</p>
            <div className="my-2 border-t border-dashed border-[#111111]" />
            {["Aceite Fino 1l", "Arroz 1kg", "Azucar 1kg", "Leche Pil 1l", "Queso Criollo", "Pan de batalla"].map((name, index) => (
              <div key={name} className="flex items-center gap-1 py-[3px] text-[8px]">
                <span className="truncate">{name}</span>
                <span className="flex-1 border-b border-dotted border-[#94A3B8]" />
                <span className="font-bold">{[18, 12, 8, 8, 55, 1][index]},00</span>
                <span
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-[#111111] text-[8px] font-bold"
                  style={{ backgroundColor: theme.sticker, color: theme.onSticker }}
                >
                  +
                </span>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="receipt-edge mx-3 h-2 bg-white" />
          <div className="mx-3 mt-3 bg-[#1E293B] px-2.5 py-2 text-[9px] font-bold text-white">
            TU PEDIDO · <span style={{ color: theme.stickerOnDark }}>Bs 34,00</span>
          </div>
        </>
      )}
    </div>
  );
}
