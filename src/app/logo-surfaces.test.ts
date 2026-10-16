import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");

describe("logo surfaces", () => {
  it("places Necly and product logos on full white rounded surfaces", () => {
    expect(css).toContain(".commerce-header-logo img, .commerce-footer-brand .brand img");
    expect(css).toContain(".product-brand { border-radius: 999px;");
    expect(css).toContain("background: #fff;");
  });
});
