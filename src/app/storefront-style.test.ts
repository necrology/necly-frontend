import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = [
  readFileSync(new URL("./globals.css", import.meta.url), "utf8"),
  readFileSync(new URL("./storefront-fixes.css", import.meta.url), "utf8"),
].join("\n");

describe("storefront mobile safeguards", () => {
  it("uses one Sora typeface and prevents accidental horizontal page overflow", () => {
    expect(css).toContain('font-family: "Sora", ui-sans-serif, system-ui, sans-serif');
    expect(css).toContain("overflow-x: clip");
  });

  it("keeps a blue header with a lower curve and fits two product cards per row on narrow screens", () => {
    expect(css).toContain(".site-header { overflow: visible; border-radius: 0 0 26px 26px; background:");
    expect(css).toContain(".commerce-product-grid, .commerce-product-grid.preview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }");
  });
});
