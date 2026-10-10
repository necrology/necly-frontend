import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/storefront-fixes.css"), "utf8");
const homeSections = readFileSync(join(process.cwd(), "src/components/commerce-home-sections.tsx"), "utf8");

describe("responsive storefront composition", () => {
  it("uses one primary mobile surface without the old body strip", () => {
    expect(css).toContain("body { background: #f4f4f4; }");
    expect(css).toContain(".site-header, .commerce-mobile-nav, .commerce-home-hero { background: #4c1ef9; }");
  });

  it("animates the services artwork and respects reduced motion", () => {
    expect(css).toContain(".commerce-home-hero-art img, .commerce-catalog-hero-art img, .figma-desktop-hero-art");
    expect(css).toContain(".commerce-catalog-hero-art img, .figma-desktop-hero-art, .commerce-stat-art");
  });

  it("renders four home preview products in four desktop columns", () => {
    expect(homeSections).toContain('<ProductSearchBar mode="preview" limit={4} />');
    expect(css).toContain(".commerce-product-grid.preview-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }");
  });
});
