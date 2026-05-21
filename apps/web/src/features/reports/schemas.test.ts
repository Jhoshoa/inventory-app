import { describe, expect, it } from "vitest";
import {
  averageTicket,
  buildReportQueryString,
  buildSalesReportApiQuery,
  buildStockMovementApiQuery,
  parseReportSearchParams,
  parseStockMovementSearchParams,
} from "./schemas";

const now = new Date("2026-05-20T12:00:00.000Z");

describe("parseReportSearchParams", () => {
  it("applies a default 30 day range", () => {
    expect(parseReportSearchParams({}, now)).toEqual({
      range: "30d",
      from: "2026-04-21",
      to: "2026-05-20",
    });
  });

  it("uses fallback dates for invalid custom dates", () => {
    expect(
      parseReportSearchParams({ range: "custom", from: "bad", to: "2026-05-10" }, now),
    ).toEqual({
      range: "custom",
      from: "2026-04-21",
      to: "2026-05-10",
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

  it("serializes API date boundaries", () => {
    expect(
      buildSalesReportApiQuery({
        range: "custom",
        from: "2026-05-01",
        to: "2026-05-20",
      }),
    ).toBe("from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-20T23%3A59%3A59.999Z");
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
