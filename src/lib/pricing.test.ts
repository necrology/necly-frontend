import { describe, expect, it } from "vitest";
import { calculatePriceBreakdown } from "./pricing";

describe("calculatePriceBreakdown", () => {
  it("membagi total dengan admin ikut menanggung", () => {
    expect(calculatePriceBreakdown(300_000, 30_000, 5, true)).toEqual({
      total: 330_000,
      divisor: 6,
      perSlot: 55_000,
      totalBilledToMembers: 275_000,
    });
  });

  it("membagi total hanya ke member saat admin tidak menanggung", () => {
    expect(calculatePriceBreakdown(300_000, 30_000, 5, false)).toEqual({
      total: 330_000,
      divisor: 5,
      perSlot: 66_000,
      totalBilledToMembers: 330_000,
    });
  });

  it("membulatkan ke atas per Rp1.000", () => {
    expect(calculatePriceBreakdown(100_001, 0, 5, false).perSlot).toBe(21_000);
    expect(calculatePriceBreakdown(100_000, 0, 5, false).perSlot).toBe(20_000);
  });

  it("mengembalikan nol untuk input kosong", () => {
    expect(calculatePriceBreakdown(0, 0, 5, true)).toEqual({
      total: 0,
      divisor: 6,
      perSlot: 0,
      totalBilledToMembers: 0,
    });
  });
});
