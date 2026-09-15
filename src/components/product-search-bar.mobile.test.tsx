import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./product-search-bar.tsx", import.meta.url), "utf8");

describe("catalog mobile layout", () => {
  it("renders every matching service and does not add a progressive reveal control", () => {
    expect(source).not.toContain("mobileInitialCount");
    expect(source).not.toContain("catalog-mobile-more");
    expect(source).toContain("displayed.map((product)");
  });
});
