import { describe, expect, it } from "vitest";
import {
  boliviaToday,
  comparisonRange,
  greeting,
  longDate,
  parseHomePeriod,
  percentChange,
  periodRange,
  timeAgo,
} from "./home";

describe("home", () => {
  it("parses the period from the URL", () => {
    expect(parseHomePeriod(undefined)).toBe("today");
    expect(parseHomePeriod("7d")).toBe("7d");
    expect(parseHomePeriod(["month"])).toBe("month");
    expect(parseHomePeriod("year")).toBe("today");
  });

  it("uses the Bolivian date, not UTC", () => {
    // 02:00 UTC del 11 = 22:00 del 10 en La Paz.
    expect(boliviaToday(new Date("2026-11-11T02:00:00Z"))).toBe("2026-11-10");
    expect(boliviaToday(new Date("2026-11-11T15:00:00Z"))).toBe("2026-11-11");
  });

  it("builds period ranges ending today", () => {
    expect(periodRange("today", "2026-11-10")).toEqual({ from: "2026-11-10", to: "2026-11-10" });
    expect(periodRange("7d", "2026-11-10")).toEqual({ from: "2026-11-04", to: "2026-11-10" });
    expect(periodRange("month", "2026-11-10")).toEqual({ from: "2026-11-01", to: "2026-11-10" });
  });

  it("compares with the matching previous period", () => {
    expect(comparisonRange("today", "2026-11-10")).toEqual({
      from: "2026-11-03",
      to: "2026-11-03",
      label: "el martes pasado",
    });
    expect(comparisonRange("7d", "2026-11-10")).toMatchObject({ from: "2026-10-28", to: "2026-11-03" });
    expect(comparisonRange("month", "2026-11-10")).toMatchObject({ from: "2026-10-01", to: "2026-10-10" });
    // 31 de marzo contra febrero: se corta en el último día de febrero.
    expect(comparisonRange("month", "2026-03-31")).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
    expect(comparisonRange("month", "2026-01-15")).toMatchObject({ from: "2025-12-01", to: "2025-12-15" });
  });

  it("computes the change in percent", () => {
    expect(percentChange("1248.50", "1114.73")).toEqual({ percent: 12, direction: "up" });
    expect(percentChange("80", "100")).toEqual({ percent: 20, direction: "down" });
    expect(percentChange("100", "100")).toEqual({ percent: 0, direction: "same" });
    expect(percentChange("100", "0")).toBeNull();
    expect(percentChange("x", "10")).toBeNull();
  });

  it("greets by the hour in Bolivia", () => {
    expect(greeting(new Date("2026-11-10T12:00:00Z"))).toBe("Buen día"); // 08:00
    expect(greeting(new Date("2026-11-10T19:00:00Z"))).toBe("Buenas tardes"); // 15:00
    expect(greeting(new Date("2026-11-11T01:00:00Z"))).toBe("Buenas noches"); // 21:00
  });

  it("formats dates and elapsed time", () => {
    expect(longDate("2026-11-10")).toBe("Martes 10 de noviembre");
    const now = new Date("2026-11-10T12:00:00Z");
    expect(timeAgo("2026-11-10T11:35:00Z", now)).toBe("hace 25 min");
    expect(timeAgo("2026-11-10T09:00:00Z", now)).toBe("hace 3 h");
    expect(timeAgo("2026-11-08T12:00:00Z", now)).toBe("hace 2 días");
    expect(timeAgo("2026-11-10T12:00:00Z", now)).toBe("recién");
  });
});
