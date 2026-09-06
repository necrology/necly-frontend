import { describe, expect, it } from "vitest";
import { filterProducts } from "./catalog";

const products = [
  { id: "1", name: "StreamFlix Slot Keluarga", slug: "streamflix-family-slot", category: "Streaming", price: 39_000, stock: 8 },
  { id: "2", name: "OfficeCloud Kursi Keluarga", slug: "officecloud-family-member", category: "Produktivitas", price: 125_000, stock: 0 },
  { id: "3", name: "DesignPro Kursi Tim", slug: "designpro-team-seat", category: "Produktivitas", price: 85_000, stock: 5 },
];

describe("filterProducts", () => {
  it("menggabungkan filter kategori, batas harga, dan ketersediaan stok", () => {
    expect(
      filterProducts(products, {
        category: "Produktivitas",
        maxPrice: 100_000,
        inStockOnly: true,
        query: "",
      }),
    ).toEqual([products[2]]);
  });

  it("memperlakukan opsi Semua sebagai tanpa filter kategori", () => {
    expect(
      filterProducts(products, {
        category: "Semua",
        maxPrice: 200_000,
        inStockOnly: false,
        query: "",
      }),
    ).toHaveLength(products.length);
  });
});
