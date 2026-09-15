import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./site-header.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-fixes.css", import.meta.url), "utf8");

describe("site header", () => {
  it("has no header search action and centers its logo", () => {
    expect(source).not.toContain("commerce-header-search");
    expect(source).not.toContain("Search,");
    expect(css).toContain(".commerce-header-logo { position: absolute; left: 50%; transform: translateX(-50%);");
    expect(css).toContain(".site-header .site-nav { min-height: 56px;");
    expect(css).toContain(".site-header .commerce-menu-trigger, .site-header .commerce-mobile-profile { width: 34px; height: 34px;");
    expect(css).toContain(".site-header .commerce-header-logo img { width: 24px; height: 24px;");
    expect(css).toContain(".site-header .nav-links { gap: 1px; margin-left: 10px;");
    expect(css).toContain(".site-header .nav-link { min-height: 34px; padding: 0 8px; font-size: 11px;");
    expect(css).toContain(".site-header .commerce-login-link { min-height: 34px; padding: 0 14px; font-size: 11px;");
  });
});
