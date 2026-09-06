import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProductMock } = vi.hoisted(() => ({ getProductMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: true,
  catalogApi: { getProduct: getProductMock },
}));

import { fetchProductFromApi } from "./page";

describe("fetchProductFromApi (demo mode)", () => {
  beforeEach(() => {
    getProductMock.mockReset();
  });

  it("mengembalikan null tanpa memanggil API saat DEMO_MODE=true", async () => {
    const product = await fetchProductFromApi("any-slug");

    expect(product).toBeNull();
    expect(getProductMock).not.toHaveBeenCalled();
  });
});