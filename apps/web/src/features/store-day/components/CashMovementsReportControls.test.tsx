import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashMovementsReportControls, buildCashMovementsExportQuery } from "./CashMovementsReportControls";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/reports/cash-movements",
  useRouter: () => ({ replace }),
}));

describe("CashMovementsReportControls", () => {
  beforeEach(() => {
    replace.mockClear();
    window.history.pushState(null, "", "/dashboard/reports/cash-movements");
  });

  it("renders date, type and export controls", () => {
    render(<CashMovementsReportControls params={{ from_date: "2026-05-01", to_date: "2026-05-22", type: "expense" }} />);

    expect(screen.getByLabelText("Tipo de movimiento de caja")).toHaveValue("expense");
    expect(screen.getByRole("link", { name: /exportar csv/i })).toHaveAttribute(
      "href",
      "/api/exports/cash-movements?from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-22T23%3A59%3A59.999Z&type=expense",
    );
  });

  it("updates type filter and resets pagination", () => {
    window.history.pushState(null, "", "/dashboard/reports/cash-movements?offset=50");
    render(<CashMovementsReportControls params={{ type: "all" }} />);

    fireEvent.change(screen.getByLabelText("Tipo de movimiento de caja"), { target: { value: "deposit" } });

    expect(replace).toHaveBeenCalledWith("/dashboard/reports/cash-movements?offset=0&type=deposit");
  });
});

describe("buildCashMovementsExportQuery", () => {
  it("maps page filters to backend export query names", () => {
    expect(buildCashMovementsExportQuery({ from_date: "2026-05-01", to_date: "2026-05-22", type: "cash_in" })).toBe(
      "from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-22T23%3A59%3A59.999Z&type=cash_in",
    );
  });

  it("omits all type from export query", () => {
    expect(buildCashMovementsExportQuery({ from_date: "2026-05-01", type: "all" })).toBe("from=2026-05-01T00%3A00%3A00.000Z");
  });
});
