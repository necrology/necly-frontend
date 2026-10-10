import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

const card = read("src", "components", "commerce-product-card.tsx");
const detail = read("src", "components", "product-detail-client.tsx");
const brand = read("src", "components", "product-brand.tsx");
const home = read("src", "components", "commerce-home-sections.tsx");
const siteLayout = read("src", "app", "(site)", "layout.tsx");
const backToTop = read("src", "components", "back-to-top.tsx");
const css = read("src", "app", "globals.css");

describe("QA mobile fixes on the storefront", () => {
  it("beri setiap badge ilustrasi ikonnya sendiri (baris 32)", () => {
    expect(card).toContain('Populer: Flame, "Best Seller": Trophy, Trending: Zap, Baru: Sparkles, Preorder: Clock3');
    expect(card).toContain("<BadgeIcon size={11}");
    expect(css).toContain(".commerce-badge { display: inline-flex;");
  });

  it('tampilkan icon mata + "Lihat Skema Harga" di setiap card, termasuk beranda (baris 31)', () => {
    expect(card).not.toContain("!compact &&");
    expect(card).toContain('<Link href={`/products/${product.slug}`} className="commerce-scheme-link"><Eye size={15} />Lihat Skema Harga</Link>');
  });

  it("pakai nama resmi Disney+ Hotstar dan label stok beraksen kuning (poin 12, baris 35)", () => {
    expect(brand).toContain('<span className="disney-word">Disney+ Hotstar</span>');
    expect(css).toContain(".commerce-stock-ready { display: inline-flex;");
    expect(css).toContain(".commerce-stock-ready.is-empty { color: #a3231b;");
    expect(detail).toContain('className={`commerce-stock-ready ${product.stock > 0 ? "" : "is-empty"}`}');
  });

  it('tampilkan "Cara Berlangganan" dan FAQ di beranda setelah produk (poin 18)', () => {
    expect(home).toContain('className="commerce-guide-section"');
    expect(home).toContain('className="commerce-faq-section"');
    expect(home.indexOf("commerce-preview-section")).toBeLessThan(home.indexOf("commerce-guide-section"));
    expect(css).toContain(".commerce-guide-steps { display: grid; grid-template-columns: repeat(4,");
  });

  it("sediakan tombol kembali ke atas di setiap halaman (poin 16)", () => {
    expect(siteLayout).toContain("<BackToTop />");
    expect(backToTop).toContain('window.scrollTo({ top: 0, behavior: "smooth" })');
    expect(css).toContain(".back-to-top.is-visible { opacity: 1;");
  });

  it("beri aksen kuning beranimasi pada card Pilihan Layanan Premium (poin 17)", () => {
    expect(home).toContain('className="commerce-quick-trust-spark"');
    expect(css).toContain("@keyframes commerce-spark");
    expect(css).toContain(".commerce-quick-trust-spark i { width: 5px; border-radius: 999px; background: #fcbd50;");
  });
});
