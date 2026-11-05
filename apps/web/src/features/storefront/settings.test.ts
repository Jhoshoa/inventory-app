import { describe, expect, it } from "vitest";
import { groupHours, isOpenNow, readableTextColor, type StorefrontDayHours } from "./settings";

const open = (opens_at: string, closes_at: string): StorefrontDayHours => ({ is_open: true, opens_at, closes_at });
const closed: StorefrontDayHours = { is_open: false, opens_at: null, closes_at: null };

// Lunes a sabado 08:00-21:00, domingo cerrado.
const WEEK = [...Array.from({ length: 6 }, () => open("08:00", "21:00")), closed];

describe("isOpenNow", () => {
  // 2026-11-02 es lunes. La Paz es UTC-4 todo el ano.
  it("is open inside the store's hours in the store's timezone", () => {
    expect(isOpenNow(WEEK, "America/La_Paz", new Date("2026-11-02T14:00:00Z"))).toBe(true); // 10:00
    expect(isOpenNow(WEEK, "America/La_Paz", new Date("2026-11-03T02:00:00Z"))).toBe(false); // lunes 22:00
  });

  it("uses the closed day", () => {
    expect(isOpenNow(WEEK, "America/La_Paz", new Date("2026-11-08T14:00:00Z"))).toBe(false); // domingo 10:00
  });

  it("handles hours that cross midnight", () => {
    const lateNight = [open("18:00", "02:00"), ...Array.from({ length: 6 }, () => closed)];
    expect(isOpenNow(lateNight, "America/La_Paz", new Date("2026-11-03T03:30:00Z"))).toBe(true); // lunes 23:30
    expect(isOpenNow(lateNight, "America/La_Paz", new Date("2026-11-03T05:00:00Z"))).toBe(true); // martes 01:00
    expect(isOpenNow(lateNight, "America/La_Paz", new Date("2026-11-03T07:00:00Z"))).toBe(false); // martes 03:00
  });
});

describe("groupHours", () => {
  it("joins consecutive days with the same hours", () => {
    expect(groupHours(WEEK)).toEqual([
      { days: "Lunes – Sabado", label: "08:00 – 21:00", open: true },
      { days: "Domingo", label: "Cerrado", open: false },
    ]);
  });
});

describe("readableTextColor", () => {
  it("picks black on light colors and white on dark ones", () => {
    expect(readableTextColor("#FFE14D")).toBe("#111111");
    expect(readableTextColor("#1F3BFF")).toBe("#FFFFFF");
    expect(readableTextColor("#111111")).toBe("#FFFFFF");
  });
});
