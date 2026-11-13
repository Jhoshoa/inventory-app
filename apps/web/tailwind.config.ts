import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          background: "var(--color-app-background)",
          surface: "var(--color-app-surface)",
          surfaceMuted: "var(--color-app-surface-muted)",
          surfaceRaised: "var(--color-app-surface-raised)",
          border: "var(--color-app-border)",
          borderStrong: "var(--color-app-border-strong)",
        },
        text: {
          strong: "var(--color-text-strong)",
          body: "var(--color-text-body)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
        },
        focus: {
          DEFAULT: "var(--color-focus-ring)",
        },
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // Variables: el panel usa el azul del estilo A (.theme-app en globals.css).
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
        },
        // Catalogo publico: los colores de cada tienda, como variables CSS
        // (ver storefrontTheme en features/storefront/settings.ts).
        sf: {
          primary: "var(--sf-primary)",
          onPrimary: "var(--sf-on-primary)",
          sticker: "var(--sf-sticker)",
          onSticker: "var(--sf-on-sticker)",
          stickerOnDark: "var(--sf-sticker-on-dark)",
          ink: "var(--sf-ink)",
          paper: "#F5F3EE",
          muted: "#55554F",
          line: "#8A8A86",
        },
        mkt: {
          paper: "#F5F3EE",
          ink: "#111111",
          cobalt: "#1F3BFF",
          sun: "#FFE14D",
          accent: "#FF4A1C",
          body: "#3A3A38",
          haze: "#E2E6FF",
          dots: "#8A8A86",
          muted: "#4D4D4A",
        },
        status: {
          success: "var(--color-status-success)",
          successBg: "var(--color-status-success-bg)",
          successBorder: "var(--color-status-success-border)",
          warning: "var(--color-status-warning)",
          warningBg: "var(--color-status-warning-bg)",
          warningBorder: "var(--color-status-warning-border)",
          danger: "var(--color-status-danger)",
          dangerHover: "var(--color-status-danger-hover)",
          dangerBg: "var(--color-status-danger-bg)",
          dangerBorder: "var(--color-status-danger-border)",
          info: "var(--color-status-info)",
          infoBg: "var(--color-status-info-bg)",
          infoBorder: "var(--color-status-info-border)",
        },
      },
      // Sitio publico (landing "boleta de mercado"): papel, cobalto, amarillo y tinta.
      fontFamily: {
        // Panel y acceso (estilo A).
        app: ["var(--font-inter)", "system-ui", "sans-serif"],
        archivo: ["var(--font-archivo)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-archivo)", "sans-serif"],
        receipt: ["var(--font-receipt)", "ui-monospace", "monospace"],
      },
      keyframes: {
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        ticker: "ticker 40s linear infinite",
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
      },
      height: {
        control: "var(--height-control)",
      },
      minHeight: {
        control: "var(--height-control)",
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        floating: "0 18px 45px -24px rgb(15 23 42 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
