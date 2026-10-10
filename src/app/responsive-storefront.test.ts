import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/storefront-fixes.css"), "utf8");
const globalCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const homeSections = readFileSync(join(process.cwd(), "src/components/commerce-home-sections.tsx"), "utf8");
const mobileHomeSlides = readFileSync(join(process.cwd(), "src/components/mobile-home-slides.tsx"), "utf8");
const productsPage = readFileSync(join(process.cwd(), "src/app/(site)/products/page.tsx"), "utf8");
const loginPage = readFileSync(join(process.cwd(), "src/app/(auth)/login/page.tsx"), "utf8");

describe("responsive storefront composition", () => {
  it("uses one primary mobile surface without the old body strip", () => {
    expect(css).toContain("body { background: #f4f4f4; }");
    expect(css).toContain(".site-header, .commerce-mobile-nav, .commerce-home-hero { background: #4c1ef9; }");
  });

  it("animates the services artwork and respects reduced motion", () => {
    expect(css).toContain(".commerce-home-hero-art img, .commerce-catalog-hero-art img, .figma-desktop-hero-art");
    expect(css).toContain(".commerce-catalog-hero-art img, .figma-desktop-hero-art, .commerce-stat-art");
  });

  it("uses the desktop service artwork at every viewport", () => {
    expect(productsPage).toContain('src="/design-assets/homepage-hero.png"');
    expect(productsPage).not.toContain("/illustrations/mobile-sharing-hero.svg");
    expect(mobileHomeSlides).toContain('image: "/design-assets/homepage-hero.png"');
    expect(mobileHomeSlides).not.toContain("/illustrations/mobile-sharing-hero.svg");
    expect(productsPage).not.toContain("/illustrations/product-workspace.svg");
    expect(productsPage).not.toContain("Pilihan praktis");
  });

  it("keeps the login page within the dynamic viewport", () => {
    expect(loginPage).toContain('className="auth-form auth-form-login"');
    expect(globalCss).toContain("body:has(.auth-form-login)");
    expect(globalCss).toContain("height: 100dvh;");
  });

  it("keeps both floating actions distinct from the primary background", () => {
    expect(globalCss).toMatch(/\.back-to-top \{[\s\S]*?color: #4c1ef9;[\s\S]*?background: #fff;/);
    expect(globalCss).toContain("color: #2a2140; background: #fcbd50;");
  });

  it("renders four home preview products in four desktop columns", () => {
    expect(homeSections).toContain('<ProductSearchBar mode="preview" limit={4} />');
    expect(css).toContain(".commerce-product-grid.preview-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }");
  });
});
