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
