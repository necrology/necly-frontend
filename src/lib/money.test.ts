import { describe, expect, it } from "vitest";
import { cartTotals, formatIDR } from "./money";

describe("formatIDR", () => {
  it("formats Indonesian rupiah without fractional digits", () => {
    expect(formatIDR(1_499_000)).toBe("Rp1.499.000");
  });
});

describe("cartTotals", () => {
  // Sama persis dengan perhitungan backend: subtotal dikurangi diskon voucher.
  // Tidak ada biaya layanan maupun kode unik, karena backend tidak menagihnya.
  it("menghitung subtotal, diskon, dan total seperti backend", () => {
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
      total: 1_150_000,
    });
  });

  it("tidak mengizinkan diskon melebihi subtotal", () => {
    expect(cartTotals([{ price: 50_000, quantity: 1 }], 900_000)).toEqual({
      subtotal: 50_000,
      discount: 50_000,
      total: 0,
    });
  });
});
