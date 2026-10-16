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

  it("replaces an older selection when the same product is ordered again", () => {
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
      selectedDevice: 3,
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      product_price_id: "price-annual",
      selectedDuration: "365 hari",
      selectedPrice: 1_900_000,
      selectedStock: 2,
      selectedDevice: 3,
      quantity: 1,
    });
  });

  it("keeps the latest device selection when the same price is ordered again", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
      selectedDevice: 1,
    });
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
      selectedDevice: 4,
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(items[0].product_price_id).toBe("price-monthly");
    expect(items[0].selectedDevice).toBe(4);
  });

  it("cleans up duplicate legacy selections for the same product", () => {
    useCartStore.setState({
      items: [
        { ...baseProduct, product_price_id: "price-monthly", selectedDuration: "30 hari", quantity: 1 },
        { ...baseProduct, product_price_id: "price-annual", selectedDuration: "365 hari", quantity: 1 },
      ],
    });

    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-annual",
      selectedDuration: "365 hari",
      selectedPrice: 1_900_000,
      selectedStock: 2,
      selectedDevice: 2,
    });

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ product_price_id: "price-annual", selectedDevice: 2, quantity: 1 }),
    ]);
  });

  it("preserves different products as separate cart entries", () => {
    useCartStore.getState().addItem({
      ...baseProduct,
      product_price_id: "price-monthly",
      selectedDuration: "30 hari",
      selectedPrice: 186_000,
      selectedStock: 4,
    });
    useCartStore.getState().addItem({
      ...baseProduct,
      id: "prd-2",
      slug: "spotify-premium",
      name: "Spotify Premium",
      product_price_id: "price-spotify-monthly",
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual(["prd-1", "prd-2"]);
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
