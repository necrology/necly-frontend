import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "components", "site-header.tsx"), "utf8");
const css = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");
const globals = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

describe("site header", () => {
  it("has no header search action and keeps its logo flush to the left", () => {
    expect(source).not.toContain("commerce-header-search");
    expect(source).not.toContain("Search,");
    expect(source).toContain('href="/orders"');
    expect(css).not.toContain("position: absolute; left: 50%; transform: translateX(-50%)");
    expect(css).toContain(".site-header .site-nav { min-height: 56px; position: relative; justify-content: flex-start;");
    expect(css).toContain(".site-header .commerce-header-logo { position: static; order: -1; margin: 0;");
    expect(css).toContain(".site-header .nav-actions { margin-left: auto; }");
    expect(globals).not.toContain(".commerce-header-logo { margin-inline: auto; }");
    expect(css).toContain(".site-header .commerce-menu-trigger, .site-header .commerce-mobile-profile { width: 44px; height: 44px;");
    expect(css).toContain(".site-header .commerce-header-logo img { width: 34px; height: 34px;");
    expect(css).toContain(".site-header .nav-links { gap: 1px; margin-left: 10px;");
    expect(css).toContain(".site-header .nav-link { min-height: 34px; padding: 0 8px; font-size: 11px;");
    expect(css).toContain(".site-header .commerce-login-link { min-height: 34px; padding: 0 14px; font-size: 11px;");
  });
});
