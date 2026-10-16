import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "components", "product-search-bar.tsx"), "utf8");

describe("catalog mobile layout", () => {
  it("renders every matching service and does not add a progressive reveal control", () => {
    expect(source).not.toContain("mobileInitialCount");
    expect(source).not.toContain("catalog-mobile-more");
    expect(source).toContain("displayed.map((product)");
  });
});
