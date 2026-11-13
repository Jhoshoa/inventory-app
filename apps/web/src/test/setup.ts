import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// next/font/local solo existe al compilar con Next: en los tests basta el nombre de la clase.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-local", variable: "font-local", style: { fontFamily: "font-local" } }),
}));

// jsdom no trae matchMedia: por defecto "pantalla angosta" (los tests que lo necesitan lo reemplazan).
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
