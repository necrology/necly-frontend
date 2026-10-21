import { describe, expect, it } from "vitest";
import { brandForProduct, mapApiCommerceProduct } from "./commerce-product";

describe("brandForProduct", () => {
  it("memetakan brand sesuai urutan kontrak W0 C-04", () => {
    expect(brandForProduct("Netflix Premium")).toEqual({ brand: "NETFLIX", logoTone: "netflix" });
    expect(brandForProduct("Bundling Hemat Disney x Netflix")).toEqual({ brand: "Disney+ × Netflix", logoTone: "disney" });
    expect(brandForProduct("Disney+ Standard")).toEqual({ brand: "Disney+ Hotstar", logoTone: "disney" });
    expect(brandForProduct("Apple Music Family")).toEqual({ brand: " Apple One", logoTone: "apple" });
    expect(brandForProduct("Microsoft 365 Family")).toEqual({ brand: "Microsoft 365", logoTone: "microsoft" });
    expect(brandForProduct("Canva Teams")).toEqual({ brand: "Canva Teams", logoTone: "canva" });
    expect(brandForProduct("Google One 2TB")).toEqual({ brand: "Google One 2 TB", logoTone: "googleone" });
    expect(brandForProduct("Dropbox Family")).toEqual({ brand: "Dropbox Family", logoTone: "dropbox" });
  });

  it("memakai nama produk sebagai fallback netral, bukan logo vendor lain", () => {
    expect(brandForProduct("Layanan Baru")).toEqual({ brand: "Layanan Baru", logoTone: "generic" });
  });
});

describe("mapApiCommerceProduct", () => {
  it("memakai id harga, stok per paket, dan kategori dari katalog live", () => {
    const product = mapApiCommerceProduct({
      id: "0192f0a3-0000-0000-0000-000000000001",
      name: "Netflix Premium - Slot Anggota Rumah Tangga",
      slug: "netflix-premium",
      description: "Slot Netflix",
      category: { id: "0192f0a2-0000-0000-0000-000000000001", name: "Streaming Video", slug: "video-streaming" },
      prices: [
        { id: "0192f0a4-0000-0000-0000-000000000019", amount: 149_000, active: false, available_slots: 9, duration: { name: "1 Bulan", days: 30 } },
        { id: "0192f0a4-0000-0000-0000-000000000001", amount: 186_000, active: true, available_slots: 1, duration: { name: "1 Bulan", days: 30 } },
      ],
    });

    expect(product.category).toBe("Streaming");
    expect(product.price).toBe(186_000);
    expect(product.stock).toBe(1);
    expect(product.priceOptions).toEqual([
      expect.objectContaining({ id: "0192f0a4-0000-0000-0000-000000000001", price: 186_000, stock: 1 }),
    ]);
    expect(product.logoTone).toBe("netflix");
    // Live data tidak mengarang provider price/diskon.
    expect(product.discount).toBe(0);
    expect(product.groupMembers).toBe(1);
  });
});
