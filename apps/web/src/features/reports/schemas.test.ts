import { describe, expect, it } from "vitest";
import {
  averageTicket,
  buildReportQueryString,
  buildSalesReportApiQuery,
  buildStockMovementApiQuery,
  comparisonLabel,
  datesForReportRange,
  parseReportSearchParams,
  parseStockMovementSearchParams,
  percentChange,
  previousRange,
  validateReportRange,
} from "./schemas";

// 12:00 UTC del 20/05 = 08:00 en La Paz.
const now = new Date("2026-05-20T12:00:00.000Z");

describe("parseReportSearchParams", () => {
  it("defaults to today in Bolivia", () => {
    expect(parseReportSearchParams({}, now)).toEqual({ range: "today", from: "2026-05-20", to: "2026-05-20" });
    // 02:00 UTC del 21 todavía es el 20 en Bolivia.
    expect(parseReportSearchParams({}, new Date("2026-05-21T02:00:00Z")).from).toBe("2026-05-20");
  });

  it("builds the presets", () => {
    expect(parseReportSearchParams({ range: "7d" }, now)).toEqual({ range: "7d", from: "2026-05-14", to: "2026-05-20" });
    expect(parseReportSearchParams({ range: "month" }, now)).toEqual({ range: "month", from: "2026-05-01", to: "2026-05-20" });
    expect(parseReportSearchParams({ range: "30d" }, now)).toEqual({ range: "30d", from: "2026-04-21", to: "2026-05-20" });
  });

  it("keeps explicit dates and falls back for invalid ones", () => {
    expect(parseReportSearchParams({ range: "custom", from: "2026-05-02", to: "2026-05-10" }, now)).toEqual({
      range: "custom",
      from: "2026-05-02",
      to: "2026-05-10",
    });
    expect(parseReportSearchParams({ range: "custom", from: "bad", to: "2026-05-10" }, now)).toEqual({
      range: "custom",
      from: "2026-05-01",
      to: "2026-05-10",
    });
    // Desde > hasta o más de 90 días: vuelve a hoy en lugar de pedir un rango que la API rechaza.
    expect(parseReportSearchParams({ range: "custom", from: "2026-05-10", to: "2026-05-01" }, now).range).toBe("today");
    expect(parseReportSearchParams({ range: "custom", from: "2026-01-01", to: "2026-05-10" }, now).range).toBe("today");
  });

  it("validates ranges with the API's limits", () => {
    expect(validateReportRange("2026-05-10", "2026-05-01")).toBe("\"Desde\" no puede ser posterior a \"Hasta\".");
    expect(validateReportRange("2026-01-01", "2026-05-10")).toBe("El rango máximo es 90 días.");
    expect(validateReportRange("2026-02-10", "2026-05-10")).toBeNull();
  });

  it("dates for a chip", () => {
    expect(datesForReportRange("today", now)).toEqual({ from: "2026-05-20", to: "2026-05-20" });
  });
});

describe("comparison with the previous period", () => {
  it("uses the same length right before", () => {
    expect(previousRange("2026-11-04", "2026-11-10")).toEqual({ from: "2026-10-28", to: "2026-11-03" });
    expect(previousRange("2026-11-10", "2026-11-10")).toEqual({ from: "2026-11-09", to: "2026-11-09" });
    expect(comparisonLabel("2026-11-04", "2026-11-10")).toBe("vs. semana anterior");
    expect(comparisonLabel("2026-11-10", "2026-11-10")).toBe("vs. el día anterior");
    expect(comparisonLabel("2026-11-01", "2026-11-12")).toBe("vs. los 12 días anteriores");
  });

  it("rounds the change and skips it without previous sales", () => {
    expect(percentChange(8412, 7936)).toBe(6);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("parseStockMovementSearchParams", () => {
  it("applies safe defaults", () => {
    expect(parseStockMovementSearchParams({ type: "unknown", limit: "500", offset: "-1" }, now)).toMatchObject({
      type: "all",
      limit: 100,
      offset: 0,
    });
  });
});

describe("query builders", () => {
  it("serializes UI query params", () => {
    expect(buildReportQueryString({ range: "7d", from: "2026-05-14", to: "2026-05-20" })).toBe(
      "range=7d&from=2026-05-14&to=2026-05-20",
    );
  });

  it("sends report dates as days", () => {
    expect(buildSalesReportApiQuery({ from: "2026-05-01", to: "2026-05-20" })).toBe("from_date=2026-05-01&to_date=2026-05-20");
  });

  it("sends stock movement days in Bolivia time, not UTC", () => {
    expect(
      buildStockMovementApiQuery({ range: "30d", from: "2026-04-21", to: "2026-05-20", type: "all", limit: 50, offset: 0 }),
    ).toBe("from=2026-04-21T00%3A00%3A00.000-04%3A00&to=2026-05-20T23%3A59%3A59.999-04%3A00&limit=50&offset=0");
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
