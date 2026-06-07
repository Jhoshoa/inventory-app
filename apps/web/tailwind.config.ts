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
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
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
      boxShadow: {
        panel: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        floating: "0 18px 45px -24px rgb(15 23 42 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
