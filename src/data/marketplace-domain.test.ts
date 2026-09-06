import { describe, expect, it } from "vitest";
import { categories, services } from "./seed";

const forbiddenConsultingTerms = [
  "linkedin",
  "seo content",
  "brand voice",
  "landing page design",
  "financial model",
  "pitch deck",
  "design system",
  "specialist",
];

describe("data marketplace Necly", () => {
  it("hanya berisi produk akun sharing berbahasa Indonesia", () => {
    expect(categories).toEqual([
      "Semua",
      "Streaming",
      "Produktivitas",
      "Kreatif",
      "Edukasi",
      "Keamanan",
    ]);

    expect(services.length).toBeGreaterThanOrEqual(8);
    for (const product of services) {
      const searchable = JSON.stringify(product).toLocaleLowerCase("id-ID");
      expect(forbiddenConsultingTerms.some((term) => searchable.includes(term))).toBe(false);
      expect(searchable).toMatch(/slot|kursi|anggota|undangan/);
      expect(searchable).toMatch(/hemat|bersama|keluarga|tim/);
      expect(product.name).not.toMatch(/family|member|team|seat/i);
      expect("priceOptions" in product).toBe(true);
      expect("termsNote" in product).toBe(true);
    }
  });

  it("tidak menyimpan bukti sosial sebelum layanan berjalan", () => {
    for (const product of services) {
      expect(product).not.toHaveProperty("rating");
      expect(product).not.toHaveProperty("reviews");
      expect(product).not.toHaveProperty("testimonials");
      expect(product.operator).not.toHaveProperty("fulfilled");
      expect(product.operator).not.toHaveProperty("responseTime");
    }
  });
});
