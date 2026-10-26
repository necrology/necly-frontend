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
  it("membersihkan label slot internal dari judul layanan (QA baris 88-89)", () => {
    const product = mapApiProduct({
      ...apiProduct,
      name: "Netflix Premium - Slot Anggota Rumah Tangga",
    });

    expect(product.name).toBe("Netflix Premium");
    expect(product.benefits.join(" ")).toContain("Akun langganan tersedia untuk dipakai bersama");
    expect(product.benefits.join(" ")).not.toMatch(/slot/i);
  });

  it("menghapus kata slot dari nama dan deskripsi produk", () => {
    const product = mapApiProduct({
      ...apiProduct,
      name: "StreamFlix Slot Keluarga",
      description: "Slot akun langganan untuk dipakai bersama.",
    });

    expect(product.name).toBe("StreamFlix");
    expect(product.summary).toBe("Akses akun langganan untuk dipakai bersama.");
    expect(product.description).not.toMatch(/slot/i);
  });

  // NEC-95: kata "Family" juga label internal dan harus hilang dari judul
  // layanan, termasuk saat digabung dengan label "Slot".
  it("menghapus kata Family dan label slot dari nama produk", () => {
    const product = mapApiProduct({
      ...apiProduct,
      name: "Spotify Premium Family - Slot Anggota",
      description: "Slot Premium Family untuk anggota keluarga yang tinggal serumah.",
    });

    expect(product.name).toBe("Spotify Premium");
    expect(product.summary).toBe("Akses Premium untuk anggota keluarga yang tinggal serumah.");
    expect(product.name).not.toMatch(/family|slot/i);
    expect(product.description).not.toMatch(/family|slot/i);
  });

  it("membersihkan brand Family dan frasa Family Sharing pada deskripsi", () => {
    const product = mapApiProduct({
      ...apiProduct,
      name: "Apple Music Family - Slot Anggota",
      description: "Slot anggota keluarga melalui Family Sharing agar biaya lebih hemat.",
    });

    expect(product.name).toBe("Apple Music");
    expect(product.description).toBe("Akses anggota keluarga melalui berbagi keluarga agar biaya lebih hemat.");
  });

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

  it("memetakan coming_soon dan image_url tanpa mengubah perilaku stok", () => {
    const product = mapApiProduct({
      ...apiProduct,
      coming_soon: true,
      image_url: "https://cdn.necly.id/produk/netflix.jpg",
      icon_url: "/design-assets/logo-netflix.png",
    });

    expect(product.comingSoon).toBe(true);
    expect(product.imageUrl).toBe("https://cdn.necly.id/produk/netflix.jpg");
    expect(product.iconUrl).toBe("/design-assets/logo-netflix.png");
    expect(product.active).toBe(true);
    expect(product.stock).toBe(6);
  });

  it("menganggap produk lama tanpa active sebagai aktif dan tanpa foto", () => {
    const product = mapApiProduct(apiProduct);

    expect(product.active).toBe(true);
    expect(product.comingSoon).toBe(false);
    expect(product.imageUrl).toBeUndefined();
    expect(product.iconUrl).toBeUndefined();
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
