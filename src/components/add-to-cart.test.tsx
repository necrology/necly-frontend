import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { addItemMock } = vi.hoisted(() => ({ addItemMock: vi.fn() }));

vi.mock("@/stores/cart-store", () => ({
  useCartStore: vi.fn((selector) => selector({ addItem: addItemMock })),
}));

import { AddToCart } from "./add-to-cart";

describe("AddToCart component", () => {
  const baseProduct = {
    id: "prd-1",
    slug: "netflix-premium",
    name: "Netflix Premium",
    category: "Streaming",
    price: 186_000,
    stock: 4,
    eyebrow: "Test",
    duration: "30 hari",
    rating: 4.5,
    reviews: 10,
    summary: "Test summary",
    description: "Test description",
    accessType: "Undangan anggota",
    benefits: [],
    activationSteps: [],
    operator: { name: "Test", role: "Test", initials: "T", fulfilled: 0, responseTime: "0" },
    accent: "blue",
    featured: false,
    priceOptions: [
      { id: "price-monthly", label: "1 bulan", duration: "30 hari", days: 30, price: 186_000, stock: 4 },
      { id: "price-annual", label: "12 bulan", duration: "365 hari", days: 365, price: 1_900_000, stock: 2 },
    ],
    testimonials: [],
    termsNote: "",
  } as import("@/lib/types").SubscriptionProduct;

  beforeEach(() => {
    addItemMock.mockReset();
  });

  it("adds item with first price option by default", () => {
    render(<AddToCart product={baseProduct} />);

    fireEvent.click(screen.getByRole("button", { name: /Tambah ke keranjang/i }));

    expect(addItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prd-1",
        product_price_id: "price-monthly",
        selectedDuration: "30 hari",
        selectedPrice: 186_000,
        selectedStock: 4,
      }),
    );
  });

  it("shows disabled button when stock is 0", () => {
    render(<AddToCart product={{ ...baseProduct, stock: 0, priceOptions: [] }} />);

    expect(screen.getByRole("button", { name: /Stok habis/i })).toBeDisabled();
  });
});