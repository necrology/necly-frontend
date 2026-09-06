import { describe, expect, it } from "vitest";
import type { ApiProduct } from "./api";
import { mapApiProduct } from "./product-mapper";

const apiProduct: ApiProduct = {
  id: "prd-1",
  category_id: "cat-1",
  stock: 4,
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
      stock: 2,
      duration: { id: "duration-annual", name: "Annual", days: 365 },
    },
    {
      id: "price-monthly",
      amount: 186_000,
      currency: "IDR",
      active: true,
      stock: 4,
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
      stock: 4,
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
