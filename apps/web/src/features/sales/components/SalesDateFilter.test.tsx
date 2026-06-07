import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesDateFilter } from "./SalesDateFilter";

const requestSubmit = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/sales",
}));

describe("SalesDateFilter", () => {
  beforeEach(() => {
    requestSubmit.mockReset();
    Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
      configurable: true,
      value: requestSubmit,
    });
    window.history.pushState(null, "", "/dashboard/sales");
  });

  it("applies the to date without changing from date", async () => {
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
    expect(requestSubmit).toHaveBeenCalled();
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
    expect(requestSubmit).toHaveBeenCalled();
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
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it("submits status with the date range", async () => {
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

    expect(requestSubmit).toHaveBeenCalled();
  });

  it("submits the current filters through a GET form", () => {
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

    const form = screen.getByLabelText("Desde").closest("form");

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/dashboard/sales");
    expect(screen.getByLabelText("Desde")).toHaveAttribute("name", "from_date");
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("name", "to_date");
    expect(screen.getByLabelText("Estado de venta")).toHaveAttribute("name", "status");
    expect(document.querySelector('input[name="offset"]')).toHaveValue("0");
    expect(document.querySelector('input[name="limit"]')).toHaveValue("50");
  });
});
