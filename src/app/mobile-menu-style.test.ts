import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./storefront-fixes.css", import.meta.url), "utf8");

describe("mobile navigation visibility", () => {
  it("does not clip the absolutely positioned menu below the rounded header", () => {
    expect(css).toContain(".site-header { overflow: visible;");
    expect(css).toContain(".commerce-mobile-nav { border-radius: 0 0 26px 26px;");
  });
});
