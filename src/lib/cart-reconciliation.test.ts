import { describe, expect, it } from "vitest";
import type { ApiProduct } from "./api";
import { reconcileCartItems } from "./cart-reconciliation";
import type { CartItem } from "@/stores/cart-store";

const catalog: ApiProduct[] = [{
  id: "0192f0a3-0000-0000-0000-000000000003",
  name: "Spotify Premium Family - Slot Anggota",
  slug: "spotify-premium-individual",
  description: "Slot keluarga",
  category: { id: "cat-1", name: "Streaming", slug: "streaming" },
  prices: [{
    id: "0192f0a4-0000-0000-0000-000000000006",
    amount: 59_000,
    active: true,
    available_slots: 4,
    duration: { name: "1 Bulan", days: 30 },
  }],
}];

const oldItem: CartItem = {
  id: "spotify-premium",
  slug: "spotify-premium",
  name: "Spotify Premium",
  category: "Streaming",
  price: 30_000,
  stock: 9,
  product_price_id: "one-month",
  selectedDuration: "1 Bulan",
  quantity: 2,
};

describe("reconcileCartItems", () => {
  it("memigrasikan id harga lama dan menyegarkan harga serta stok", () => {
    const result = reconcileCartItems([oldItem], catalog);

    expect(result).toMatchObject({ changed: true, unresolved: 0 });
    expect(result.items[0]).toMatchObject({
      id: catalog[0].id,
      slug: catalog[0].slug,
      product_price_id: catalog[0].prices?.[0].id,
      price: 59_000,
      stock: 4,
      quantity: 2,
    });
  });

  it("tidak mengganti paket bila durasi lamanya sudah tidak tersedia", () => {
    const result = reconcileCartItems([{ ...oldItem, selectedDuration: "6 Bulan" }], catalog);

    expect(result.unresolved).toBe(1);
    expect(result.items[0].product_price_id).toBe("one-month");
  });

  it("menandai perubahan harga live untuk persetujuan sebelum pembayaran", () => {
    const liveItem: CartItem = {
      ...oldItem,
      id: catalog[0].id,
      slug: catalog[0].slug,
      product_price_id: catalog[0].prices![0].id,
      selectedPrice: 30_000,
      price: 30_000,
    };

    const result = reconcileCartItems([liveItem], catalog);

    expect(result.unresolved).toBe(0);
    expect(result.previousSubtotal).toBe(60_000);
    expect(result.currentSubtotal).toBe(118_000);
    expect(result.issues).toContainEqual(expect.objectContaining({ reason: "price_changed" }));
    expect(result.items[0].price).toBe(59_000);
  });

  it("tidak memindahkan id harga UUID yang hilang ke paket berdurasi mirip", () => {
    const missingPrice: CartItem = {
      ...oldItem,
      id: "0192f0a3-0000-0000-0000-000000000003",
      slug: "spotify-premium-individual",
      product_price_id: "0192f0a4-0000-0000-0000-000000000099",
      selectedPrice: 59_000,
      price: 59_000,
    };

    const result = reconcileCartItems([missingPrice], catalog);

    expect(result.unresolved).toBe(1);
    expect(result.issues[0]).toMatchObject({ reason: "unavailable" });
    expect(result.items[0].product_price_id).toBe("0192f0a4-0000-0000-0000-000000000099");
  });

  it("mengagregasi baris duplikat sebelum memeriksa stok", () => {
    const scarceCatalog = [{ ...catalog[0], prices: [{ ...catalog[0].prices![0], available_slots: 1 }] }];
    const line: CartItem = {
      ...oldItem,
      id: catalog[0].id,
      slug: catalog[0].slug,
      product_price_id: catalog[0].prices![0].id,
      price: 59_000,
      selectedPrice: 59_000,
      quantity: 1,
    };

    const result = reconcileCartItems([line, { ...line }], scarceCatalog);

    expect(result.unresolved).toBe(2);
    expect(result.issues).toEqual([
      expect.objectContaining({ reason: "stock_exceeded" }),
      expect.objectContaining({ reason: "stock_exceeded" }),
    ]);
    expect(result.items.every((item) => item.quantity === 1)).toBe(true);
  });

  it("menandai paket tanpa slot tersedia sebagai tidak tersedia", () => {
    const emptyCatalog = [{ ...catalog[0], prices: [{ ...catalog[0].prices![0], available_slots: 0 }] }];
    const liveItem: CartItem = {
      ...oldItem,
      id: catalog[0].id,
      slug: catalog[0].slug,
      product_price_id: catalog[0].prices![0].id,
      price: 59_000,
      selectedPrice: 59_000,
    };

    const result = reconcileCartItems([liveItem], emptyCatalog);

    expect(result.unresolved).toBe(1);
    expect(result.issues[0]).toMatchObject({ reason: "unavailable" });
  });
});
