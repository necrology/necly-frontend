import { describe, expect, it } from "vitest";
import type { ApiProduct } from "./api";
import { mapApiProduct } from "./product-mapper";

// Bentuknya mengikuti payload /public/products apa adanya: ketersediaan datang
// sebagai available_slots per harga, dan produk tidak punya field stock.
const apiProduct: ApiProduct = {
  id: "prd-1",
  category_id: "cat-1",
  category: {
    id: "cat-1",
    name: "Video Streaming",
    slug: "video-streaming",
  },
  name: "Netflix Premium",
  slug: "netflix-premium",
  description: "4K HDR streaming",
  prices: [
    {
      id: "price-annual",
      amount: 1_900_000,
      currency: "IDR",
      active: true,
      available_slots: 2,
      duration: { id: "duration-annual", name: "Annual", days: 365 },
    },
    {
      id: "price-monthly",
      amount: 186_000,
      currency: "IDR",
      active: true,
      available_slots: 4,
      duration: { id: "duration-monthly", name: "Monthly", days: 30 },
    },
  ],
};

describe("mapApiProduct", () => {
  it("maps the API contract into a filterable Indonesian catalog product", () => {
    const product = mapApiProduct(apiProduct);

    expect(product).toMatchObject({
      id: "prd-1",
      slug: "netflix-premium",
      name: "Netflix Premium",
      category: "Streaming",
      price: 186_000,
      stock: 6,
      duration: "30 hari",
      accessType: "Undangan anggota",
    });
    expect(product.priceOptions).toEqual([
      {
        id: "price-monthly",
        label: "1 bulan",
        duration: "30 hari",
        days: 30,
        price: 186_000,
        stock: 4,
      },
      {
        id: "price-annual",
        label: "12 bulan",
        duration: "365 hari",
        days: 365,
        price: 1_900_000,
        stock: 2,
      },
    ]);
    expect(product.eyebrow).toBe("Akun sharing hemat");
    expect(product.benefits.join(" ")).toMatch(/bersama|hemat/);
  });

  // Katalog tidak pernah mengirim `stock`; membaca field itu membuat seluruh
  // etalase tampil "Stok habis" walaupun slotnya tersedia, dan keranjang
  // mengunci jumlah di angka yang salah.
  it("membaca ketersediaan dari available_slots, bukan stock", () => {
    const product = mapApiProduct(apiProduct);

    expect(product.priceOptions.map((option) => option.stock)).toEqual([4, 2]);
    expect(product.stock).toBe(6);
  });

  it("menjumlahkan slot seluruh paket bila produk tidak punya stok sendiri", () => {
    const product = mapApiProduct({
      id: "prd-3",
      name: "Produk Digital",
      slug: "produk-digital",
      description: "Akses digital resmi.",
      prices: [
        { id: "a", amount: 10_000, active: true, available_slots: 0, duration: { id: "d1", name: "Bulanan", days: 30 } },
        { id: "b", amount: 90_000, active: true, available_slots: 3, duration: { id: "d2", name: "Tahunan", days: 365 } },
      ],
    });

    expect(product.stock).toBe(3);
    expect(product.priceOptions[0].stock).toBe(0);
  });

  it("tidak membuat bukti sosial dari data API", () => {
    const product = mapApiProduct(apiProduct);

    expect(product).not.toHaveProperty("rating");
    expect(product).not.toHaveProperty("reviews");
    expect(product).not.toHaveProperty("testimonials");
    expect(product.operator).not.toHaveProperty("fulfilled");
    expect(product.operator).not.toHaveProperty("responseTime");
  });

  it("keeps a product renderable when optional API relations are absent", () => {
    const product = mapApiProduct({
      id: "prd-2",
      name: "Produk Digital",
      slug: "produk-digital",
      description: "Akses digital resmi.",
      prices: [],
    });

    expect(product.category).toBe("Produktivitas");
    expect(product.price).toBe(0);
    expect(product.stock).toBe(0);
    expect(product.priceOptions).toEqual([]);
  });
});
