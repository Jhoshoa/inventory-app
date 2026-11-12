import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportRangeFilter } from "./ReportRangeFilter";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/reports/stock-movements",
  useSearchParams: () => new URLSearchParams("range=today&from=2026-11-10&to=2026-11-10&type=sale&offset=50"),
}));

describe("ReportRangeFilter", () => {
  beforeEach(() => router.push.mockReset());

  it("changes the range and keeps the other filters", async () => {
    const user = userEvent.setup();
    render(<ReportRangeFilter params={{ range: "today", from: "2026-11-10", to: "2026-11-10" }} />);

    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "7 días" }));

    const url = router.push.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/dashboard\/reports\/stock-movements\?/);
    const query = new URLSearchParams(url.split("?")[1]);
    expect(query.get("range")).toBe("7d");
    expect(query.get("type")).toBe("sale");
    expect(query.has("offset")).toBe(false);
  });

  it("checks chosen dates before asking", async () => {
    const user = userEvent.setup();
    render(<ReportRangeFilter params={{ range: "today", from: "2026-11-10", to: "2026-11-10" }} />);

    await user.click(screen.getByRole("button", { name: "Fechas" }));
    const [from] = screen.getAllByLabelText(/Desde/);
    await user.clear(from);
    await user.type(from, "2026-11-12");

    expect(screen.getByRole("alert")).toHaveTextContent("\"Desde\" no puede ser posterior a \"Hasta\".");
    expect(router.push).not.toHaveBeenCalled();
  });
});
