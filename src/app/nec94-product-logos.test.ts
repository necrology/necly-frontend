import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), "utf8");

const productBrand = read("src", "components", "product-brand.tsx");
const brandRules = read("src", "lib", "commerce-product.ts");
const productCard = read("src", "components", "commerce-product-card.tsx");
const productDetail = read("src", "components", "product-detail-client.tsx");
const searchBar = read("src", "components", "product-search-bar.tsx");
const productPage = read("src", "app", "(site)", "products", "[slug]", "page.tsx");

describe("NEC-94 logo Canva Teams dan Google One", () => {
  it("memakai berkas logo baru pada kedua produk", () => {
    expect(productBrand).toContain('src="/design-assets/logo-canva.png"');
    expect(productBrand).toContain('src="/design-assets/logo-google-one.png"');
    expect(productBrand).not.toContain("logo-canva.svg");
    expect(productBrand).not.toContain("logo-google-one.svg");
  });

  it("menyimpan aset logo baru sebagai PNG yang valid", () => {
    for (const logo of ["logo-canva.png", "logo-google-one.png"]) {
      const asset = join(process.cwd(), "public", "design-assets", logo);
      expect(existsSync(asset)).toBe(true);
      expect(statSync(asset).size).toBeGreaterThan(1_000);
      expect(readFileSync(asset).subarray(1, 4).toString("ascii")).toBe("PNG");
    }
    expect(existsSync(join(process.cwd(), "public", "design-assets", "logo-canva.svg"))).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "design-assets", "logo-google-one.svg"))).toBe(false);
  });

  it("mengenali nama produk Canva dan Google One dari katalog API", () => {
    expect(brandRules).toContain('pattern: /canva/i, tone: "canva"');
    expect(brandRules).toContain('pattern: /google one/i, tone: "googleone"');
  });

  it("menampilkan logo yang sama di kartu produk, detail, pencarian, dan produk terkait", () => {
    expect(productCard).toContain("<ProductBrand product={product}");
    expect(productDetail).toContain("<ProductBrand product={product} />");
    expect(searchBar).toContain("<CommerceProductCard");
    expect(productPage).toContain("<CommerceProductCard");
  });
});
