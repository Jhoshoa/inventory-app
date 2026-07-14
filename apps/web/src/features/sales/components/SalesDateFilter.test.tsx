import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesDateFilter } from "./SalesDateFilter";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/sales",
  useRouter: () => ({ replace }),
}));

describe("SalesDateFilter", () => {
  beforeEach(() => {
    replace.mockReset();
    window.history.pushState(null, "", "/dashboard/sales");
  });

  it("navigates when to date changes", async () => {
    render(
      <SalesDateFilter
        firstBusinessDate="2026-06-01"
        params={{
          from_date: "2026-06-01",
          limit: 50,
          offset: 0,
          status: "all",
          to_date: "2026-06-07",
        }}
      />,
    );

    const from = screen.getByLabelText("Desde");
    const to = screen.getByLabelText("Hasta");

    fireEvent.change(to, { target: { value: "2026-06-05" } });

    expect(from).toHaveValue("2026-06-01");
    expect(to).toHaveValue("2026-06-05");
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("from_date=2026-06-01"),
    );
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("to_date=2026-06-05"),
    );
  });

  it("keeps to date independent when from date changes", async () => {
    render(
      <SalesDateFilter
        firstBusinessDate="2026-06-01"
        params={{
          from_date: "2026-06-01",
          limit: 50,
          offset: 0,
          status: "all",
          to_date: "2026-06-07",
        }}
      />,
    );

    const from = screen.getByLabelText("Desde");
    const to = screen.getByLabelText("Hasta");

    fireEvent.change(from, { target: { value: "2026-06-04" } });

    expect(from).toHaveValue("2026-06-04");
    expect(to).toHaveValue("2026-06-07");
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("from_date=2026-06-04"),
    );
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("to_date=2026-06-07"),
    );
  });

  it("blocks invalid date ranges before navigating", async () => {
    render(
      <SalesDateFilter
        firstBusinessDate="2026-06-01"
        params={{
          from_date: "2026-06-04",
          limit: 50,
          offset: 0,
          status: "all",
          to_date: "2026-06-07",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-06-01" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha desde no puede ser posterior a la fecha hasta.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("navigates with status when status changes", async () => {
    render(
      <SalesDateFilter
        firstBusinessDate={null}
        params={{
          from_date: "2026-06-01",
          limit: 25,
          offset: 50,
          status: "all",
          to_date: "2026-06-07",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Estado de venta"), { target: { value: "voided" } });

    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("status=voided"),
    );
  });

  it("renders filter controls with correct names", () => {
    render(
      <SalesDateFilter
        firstBusinessDate={null}
        params={{
          from_date: "2026-06-01",
          limit: 50,
          offset: 0,
          status: "completed",
          to_date: "2026-06-07",
        }}
      />,
    );

    expect(screen.getByLabelText("Desde")).toHaveAttribute("name", "from_date");
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("name", "to_date");
    expect(screen.getByLabelText("Estado de venta")).toHaveAttribute("name", "status");
  });
});
