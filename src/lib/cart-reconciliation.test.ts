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
});
