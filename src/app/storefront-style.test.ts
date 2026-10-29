import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
const storefrontCss = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");
const rootLayout = readFileSync(join(process.cwd(), "src", "app", "layout.tsx"), "utf8");
const css = [globalsCss, storefrontCss].join("\n");

describe("storefront mobile safeguards", () => {
  it("uses Montserrat consistently in the storefront and prevents accidental horizontal page overflow", () => {
    expect(storefrontCss).toContain('font-family: "Montserrat", ui-sans-serif, system-ui, sans-serif');
    expect(storefrontCss).toContain('font-family: "Montserrat", sans-serif');
    expect(storefrontCss).not.toMatch(/font-family: "Sora"/);
    expect(rootLayout).toContain('import "@fontsource/montserrat/400.css";');
    expect(rootLayout).toContain('import "@fontsource/montserrat/700.css";');
    expect(globalsCss).toContain('font-family: "Montserrat", ui-sans-serif, system-ui, sans-serif');
    expect(globalsCss).toContain('.dashboard-layout { font-family: "Sora", ui-sans-serif, system-ui, sans-serif; }');
    expect(css).toContain("overflow-x: clip");
  });

  it("keeps a blue header with a lower curve and fits two product cards per row on narrow screens", () => {
    expect(css).toContain(".site-header { overflow: visible; border-radius: 0 0 26px 26px; background:");
    expect(css).toContain(".commerce-product-grid, .commerce-product-grid.preview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }");
  });
});
