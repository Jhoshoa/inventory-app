import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateRangeFilter } from "./DateRangeFilter";

const requestSubmit = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/reports",
}));

describe("DateRangeFilter", () => {
  beforeEach(() => {
    requestSubmit.mockReset();
    Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
      configurable: true,
      value: requestSubmit,
    });
  });

  it("submits a native GET form when a preset changes", () => {
    render(
      <DateRangeFilter
        params={{
          from: "2026-06-01",
          range: "month",
          to: "2026-06-07",
        }}
        firstBusinessDate="2026-05-21"
      />,
    );

    const form = screen.getByLabelText("Rango de reportes").closest("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/dashboard/reports");
    expect(screen.queryByRole("button", { name: /buscar/i })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("0")).toHaveAttribute("name", "offset");

    fireEvent.change(screen.getByLabelText("Rango de reportes"), {
      target: { value: "7d" },
    });

    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toMatch(
      /\d{4}-\d{2}-\d{2}/,
    );
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toMatch(
      /\d{4}-\d{2}-\d{2}/,
    );
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it("marks manual date changes as custom and submits automatically", () => {
    render(
      <DateRangeFilter
        params={{
          from: "2026-06-01",
          range: "month",
          to: "2026-06-07",
        }}
        firstBusinessDate="2026-05-21"
      />,
    );

    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-06-04" },
    });

    expect(screen.getByLabelText("Rango de reportes")).toHaveValue("custom");
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it("blocks inverted ranges before submitting", () => {
    render(
      <DateRangeFilter
        params={{
          from: "2026-06-01",
          range: "month",
          to: "2026-06-07",
        }}
        firstBusinessDate="2026-05-21"
      />,
    );

    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-06-08" },
    });

    expect(requestSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha desde no puede ser posterior a la fecha hasta.",
    );
  });

  it("blocks dates before the store first business date", () => {
    render(
      <DateRangeFilter
        params={{
          from: "2026-06-01",
          range: "month",
          to: "2026-06-07",
        }}
        firstBusinessDate="2026-05-21"
      />,
    );

    expect(screen.getByText("La fecha minima disponible es 2026-05-21.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-05-20" },
    });

    expect(requestSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha minima disponible es 2026-05-21.",
    );
  });
});
