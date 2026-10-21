import { describe, expect, it } from "vitest";
import { productStatus, productStatusPayload } from "./product-status";

describe("status produk dashboard", () => {
  it("menurunkan tiga status dari active dan coming_soon", () => {
    expect(productStatus({ active: true, comingSoon: false })).toBe("Aktif");
    expect(productStatus({ active: true, comingSoon: true })).toBe("Coming Soon");
    expect(productStatus({ active: false, comingSoon: false })).toBe("Nonaktif");
    expect(productStatus({ active: false, comingSoon: true })).toBe("Nonaktif");
  });

  it("mengirim pasangan active/coming_soon yang konsisten", () => {
    expect(productStatusPayload("Aktif")).toEqual({ active: true, coming_soon: false });
    expect(productStatusPayload("Coming Soon")).toEqual({ active: true, coming_soon: true });
    expect(productStatusPayload("Nonaktif")).toEqual({ active: false, coming_soon: false });
  });
});
