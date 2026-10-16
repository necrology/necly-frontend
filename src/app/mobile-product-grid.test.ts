import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");

describe("mobile digital-product layout", () => {
  it("wraps long brand rows and prevents product-card children from widening the page", () => {
    expect(css).toContain(".commerce-card-brand-row { flex-wrap: wrap;");
    expect(css).toContain(".commerce-card-brand-row > * { min-width: 0; max-width: 100%;");
    expect(css).toContain(".commerce-product-card, .commerce-product-card * { min-width: 0; }");
  });
});
