import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./storefront-fixes.css", import.meta.url), "utf8");

describe("mobile digital-product layout", () => {
  it("wraps long brand rows and prevents product-card children from widening the page", () => {
    expect(css).toContain(".commerce-card-brand-row { flex-wrap: wrap;");
    expect(css).toContain(".commerce-card-brand-row > * { min-width: 0; max-width: 100%;");
    expect(css).toContain(".commerce-product-card, .commerce-product-card * { min-width: 0; }");
  });
});
