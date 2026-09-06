import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./cart-store";

const baseProduct = {
  id: "prd-1",
  slug: "netflix-premium",
  name: "Netflix Premium",
  category: "Streaming",
  price: 186_000,
  stock: 4,
  priceOptions: [
    { id: "price-monthly", label: "1 bulan", duration: "30 hari", days: 30, price: 186_000, stock: 4 },
    { id: "price-annual", label: "12 bulan", duration: "365 hari", days: 365, price: 1_900_000, stock: 2 },
  ],
};

describe("cart store (price selection)", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [] });
  });

  it("adds item with selected price option and stores product_price_id", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "prd-1",
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
      quantity: 1,
    });
  });

  it("treats different price options for same product as separate cart entries", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
    });
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-annual",
      selectedDuration: "365 hari",
      selectedPrice: 1_900_000,
      selectedStock: 2,
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.product_price_id === "price-monthly")).toBeDefined();
    expect(items.find((i) => i.product_price_id === "price-annual")).toBeDefined();
  });

  it("increments quantity when same product_price_id is added again", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
    });
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].product_price_id).toBe("price-monthly");
  });

  it("respects stock limit for selected price option", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-annual",
      selectedDuration: "365 hari",
      selectedPrice: 1_900_000,
      selectedStock: 2,
    });
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-annual",
      selectedDuration: "365 hari",
      selectedPrice: 1_900_000,
      selectedStock: 2,
    });
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-annual",
      selectedDuration: "365 hari",
      selectedPrice: 1_900_000,
      selectedStock: 2,
    });

    const items = useCartStore.getState().items;
    expect(items[0].quantity).toBe(2);
  });

  it("persists cart items with product_price_id to localStorage", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
    });

    const stored = localStorage.getItem("necly-cart");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.items).toHaveLength(1);
    expect(parsed.state.items[0].product_price_id).toBe("price-monthly");
  });
});