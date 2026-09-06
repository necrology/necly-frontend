import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProductMock } = vi.hoisted(() => ({
  getProductMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  catalogApi: { getProduct: getProductMock },
}));

import { fetchProductFromApi } from "./page";

describe("fetchProductFromApi (live-first behavior)", () => {
  beforeEach(() => {
    getProductMock.mockReset();
  });

  it("memanggil catalogApi.getProduct saat DEMO_MODE=false", async () => {
    getProductMock.mockResolvedValue({
      id: "prd-api-1",
      name: "API Product",
      slug: "api-product",
      description: "Deskripsi dari API",
      category: { name: "Streaming", slug: "video-streaming" },
      prices: [
        { id: "price-1", amount: 150_000, currency: "IDR", active: true, stock: 5, duration: { name: "Monthly", days: 30 } },
      ],
      stock: 10,
    });

    const product = await fetchProductFromApi("api-product");

    expect(getProductMock).toHaveBeenCalledWith("api-product");
    expect(product).not.toBeNull();
    expect(product?.name).toBe("API Product");
    expect(product?.priceOptions).toHaveLength(1);
    expect(product?.priceOptions[0].price).toBe(150_000);
  });

  it("mengembalikan null saat API mengembalikan null (404)", async () => {
    getProductMock.mockResolvedValue(null);

    const product = await fetchProductFromApi("tidak-ada");

    expect(product).toBeNull();
  });

  it("mengembalikan null saat API error", async () => {
    getProductMock.mockRejectedValue(new Error("Network error"));

    const product = await fetchProductFromApi("error-slug");

    expect(product).toBeNull();
  });
});