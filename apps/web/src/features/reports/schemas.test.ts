import { describe, expect, it } from "vitest";
import {
  averageTicket,
  buildReportQueryString,
  buildSalesReportApiQuery,
  buildStockMovementApiQuery,
  datesForReportRange,
  parseReportSearchParams,
  parseStockMovementSearchParams,
} from "./schemas";

const now = new Date("2026-05-20T12:00:00.000Z");

describe("parseReportSearchParams", () => {
  it("applies a default today range when no range param is provided", () => {
    expect(parseReportSearchParams({}, now)).toEqual({
      range: "today",
      from: "2026-05-20",
      to: "2026-05-20",
    });
  });

  it("uses fallback dates for invalid custom dates", () => {
    expect(
      parseReportSearchParams({ range: "custom", from: "bad", to: "2026-05-10" }, now),
    ).toEqual({
      range: "custom",
      from: "2026-05-01",
      to: "2026-05-10",
    });
  });

  it("respects explicit date params for presets", () => {
    expect(
      parseReportSearchParams({ range: "today", from: "2026-05-22", to: "2026-05-22" }, now),
    ).toEqual({
      range: "today",
      from: "2026-05-22",
      to: "2026-05-22",
    });
  });
});

describe("datesForReportRange", () => {
  it("formats dates from local calendar fields instead of UTC ISO day", () => {
    const localDate = new Date(2026, 4, 22, 20, 30, 0);

    expect(datesForReportRange("today", localDate)).toEqual({
      from: "2026-05-22",
      to: "2026-05-22",
    });
  });
});

describe("parseStockMovementSearchParams", () => {
  it("applies safe defaults", () => {
    expect(
      parseStockMovementSearchParams({ type: "unknown", limit: "500", offset: "-1" }, now),
    ).toMatchObject({
      type: "all",
      limit: 100,
      offset: 0,
    });
  });
});

describe("report query builders", () => {
  it("serializes UI query params", () => {
    expect(
      buildReportQueryString({
        range: "7d",
        from: "2026-05-14",
        to: "2026-05-20",
      }),
    ).toBe("range=7d&from=2026-05-14&to=2026-05-20");
  });

  it("serializes sales report API dates without UTC boundaries", () => {
    expect(
      buildSalesReportApiQuery({
        range: "custom",
        from: "2026-05-01",
        to: "2026-05-20",
      }),
    ).toBe("from_date=2026-05-01&to_date=2026-05-20");
  });

  it("omits all movement type from backend query", () => {
    expect(
      buildStockMovementApiQuery({
        range: "30d",
        from: "2026-04-21",
        to: "2026-05-20",
        type: "all",
        limit: 50,
        offset: 0,
      }),
    ).toBe("from=2026-04-21T00%3A00%3A00.000Z&to=2026-05-20T23%3A59%3A59.999Z&limit=50&offset=0");
  });
});

describe("averageTicket", () => {
  it("returns zero when there are no sales", () => {
    expect(averageTicket("100", 0)).toBe("0");
  });

  it("calculates the average ticket", () => {
    expect(averageTicket("120", 3)).toBe("40.00");
  });
});
