import localFont from "next/font/local";

// Fuentes guardadas en el repo (src/fonts): el build no depende de Google Fonts,
// que desde el servidor de deploy respondia URLs que next/font/google no sabia
// leer. Se sirven desde el propio sitio, como exige el CSP (font-src 'self').
// Archivo y JetBrains Mono: la landing y los catalogos publicos. Inter: el panel.
export const archivo = localFont({
  src: "../fonts/archivo-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
});
export const archivoBlack = localFont({
  src: "../fonts/archivo-black-latin-400.woff2",
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
export const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono-latin-wght.woff2",
  weight: "100 800",
  variable: "--font-receipt",
  display: "swap",
});

// Panel y acceso (estilo A "Mostrador").
export const inter = localFont({
  src: "../fonts/inter-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const publicFontVariables = `${archivo.variable} ${archivoBlack.variable} ${jetbrainsMono.variable}`;
