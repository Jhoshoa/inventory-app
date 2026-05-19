import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { DashboardOverview } from "./DashboardOverview";
import { createEmptyDashboardSummary } from "../api";

describe("DashboardOverview", () => {
  it("renders the empty state", () => {
    render(<DashboardOverview summary={{ ok: true, data: createEmptyDashboardSummary() }} />);

    expect(screen.getByText("Tu tienda aun no tiene actividad")).toBeInTheDocument();
    expect(screen.getByText("Sin ventas recientes")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(
      <DashboardOverview
        summary={{
          ok: false,
          error: new ApiError({
            status: 500,
            code: "server_error",
            message: "Backend unavailable",
          }),
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
  });
});
