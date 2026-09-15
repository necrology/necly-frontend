import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./storefront-fixes.css", import.meta.url), "utf8");

describe("desktop storefront layout", () => {
  it("uses a desktop-only layout pass with a four-card product grid", () => {
    expect(css).toContain("@media (min-width: 1025px)");
    expect(css).toContain(".commerce-product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }");
    expect(css).toContain(".commerce-home-hero-inner { grid-template-columns: minmax(0, 1fr) minmax(360px, .9fr);");
  });
});
