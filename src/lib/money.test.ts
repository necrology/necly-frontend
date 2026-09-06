import { describe, expect, it } from "vitest";
import { cartTotals, formatIDR } from "./money";

describe("formatIDR", () => {
  it("formats Indonesian rupiah without fractional digits", () => {
    expect(formatIDR(1_499_000)).toBe("Rp1.499.000");
  });
});

describe("cartTotals", () => {
  it("calculates subtotal, discount, service fee, and total", () => {
    expect(
      cartTotals(
        [
          { price: 500_000, quantity: 2 },
          { price: 250_000, quantity: 1 },
        ],
        100_000,
      ),
    ).toEqual({
      subtotal: 1_250_000,
      discount: 100_000,
      serviceFee: 28_750,
      total: 1_178_750,
    });
  });
});
