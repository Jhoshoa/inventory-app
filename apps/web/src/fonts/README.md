# Fuentes de la landing, el catálogo y el panel

Se sirven desde el propio sitio con `next/font/local`. Antes se usaba
`next/font/google`, que las descarga de Google Fonts **al construir**: desde el
servidor de deploy Google respondia con URLs sin extension (`/l/font?kit=...`) y
`pnpm build` fallaba con `Cannot read properties of null (reading '1')`.

Solo el subconjunto latin (incluye á, é, ñ, ¿, ¡). Origen: paquetes de
[Fontsource](https://fontsource.org) 5.3.0, licencia SIL OFL 1.1 (ver LICENSE-*).

| Archivo | Paquete | Pesos |
| --- | --- | --- |
| `archivo-latin-wght.woff2` | `@fontsource-variable/archivo` | 100–900 (variable) |
| `archivo-black-latin-400.woff2` | `@fontsource/archivo-black` | 400 |
| `jetbrains-mono-latin-wght.woff2` | `@fontsource-variable/jetbrains-mono` | 100–800 (variable) |
| `inter-latin-wght.woff2` | `@fontsource-variable/inter` | 100–900 (variable) · panel y acceso |
