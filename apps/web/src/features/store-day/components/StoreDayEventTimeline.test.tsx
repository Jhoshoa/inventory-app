import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoreDayEventTimeline } from "./StoreDayEventTimeline";

describe("StoreDayEventTimeline", () => {
  it("renders store day events with notes", () => {
    render(
      <StoreDayEventTimeline
        events={{
          ok: true,
          data: [
            {
              id: "event-1",
              business_day_id: "day-1",
              store_id: "store-1",
              event_type: "open",
              note: "Inicio",
              created_by_user_id: "user-1",
              created_at: "2026-05-21T12:00:00Z",
            },
            {
              id: "event-2",
              business_day_id: "day-1",
              store_id: "store-1",
              event_type: "close",
              note: null,
              created_by_user_id: "user-1",
              created_at: "2026-05-21T20:00:00Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Apertura")).toBeInTheDocument();
    expect(screen.getByText("Cierre")).toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<StoreDayEventTimeline events={{ ok: true, data: [] }} />);

    expect(screen.getByText("Sin eventos de jornada para hoy.")).toBeInTheDocument();
  });
});
