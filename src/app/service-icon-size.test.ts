import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");
const globalCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
const brandComponent = readFileSync(join(process.cwd(), "src", "components", "product-brand.tsx"), "utf8");

describe("service icon sizing", () => {
  it("menormalisasi logo fallback dalam canvas bersama tanpa override ukuran per-brand", () => {
    expect(css).toContain(".figma-desktop-product-assets {\n  width: min(100%, 132px);");
    expect(css).toContain("height: 40px;");
    expect(css).toContain("object-fit: contain;");
    expect(css).not.toMatch(/asset-(netflix|spotify|nord|youtube|canva|googleone|dropbox)\s*>\s*img/);
    expect(css).not.toContain("spotify-asset-crop");
    expect(brandComponent).not.toContain("spotify-asset-crop");
  });

  it("memberikan canvas konsisten untuk mode compact, normal, dan desktop", () => {
    expect(css).toContain(".product-brand .product-brand-icon { width: min(100%, 132px) !important; height: 40px !important; }");
    expect(css).toContain(".product-brand.compact .product-brand-icon { height: 30px !important; }");
    expect(css).toContain(".product-brand .product-brand-icon { width: min(100%, 180px) !important; height: 46px !important; }");
    expect(css).toContain(".product-brand.compact .product-brand-icon { height: 42px !important; }");
  });

  it("mempertahankan rasio icon_url backend tanpa stretch atau crop", () => {
    expect(globalCss).toContain(".product-icon { display: inline-flex; align-items: center; justify-content: center; min-width: 0; overflow: hidden; }");
    expect(globalCss).toContain(".product-icon-image { width: 100%; height: 100%; display: block; object-fit: contain; object-position: center; }");
    expect(globalCss).not.toMatch(/product-brand-icon[^}]+height:\s*auto\s*!important/);
  });
});
