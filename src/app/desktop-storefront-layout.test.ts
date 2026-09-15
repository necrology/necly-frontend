import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/storefront-fixes.css"), "utf8");
const globalCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("desktop storefront layout", () => {
  it("starts the desktop layout at 1024px with a four-card product grid", () => {
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain(".commerce-product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }");
    expect(css).toContain(".commerce-catalog .commerce-offer-banner + .commerce-product-grid");
    expect(css).toContain(".commerce-home-hero-inner { grid-template-columns: minmax(0, 1fr) minmax(360px, .9fr);");
  });

  it("stops tablet rules before the desktop breakpoint", () => {
    expect(globalCss).not.toContain("@media (max-width: 1024px)");
    expect(globalCss).toContain("@media (max-width: 1023px)");
  });

  it("ships the original desktop artwork instead of generated placeholders", () => {
    const requiredAssets = [
      "homepage-hero.png",
      "necly-logo.png",
      "stat-users.png",
      "stat-transactions.png",
      "stat-services.png",
      "stat-satisfaction.png",
      "home-benefits.png",
      "logo-disney.png",
      "logo-netflix.png",
      "logo-apple-one.png",
      "logo-viu.png",
      "logo-nordvpn.png",
      "logo-spotify.png",
      "logo-youtube.png",
      "logo-microsoft-365.png",
      "guide-step-1.png",
      "guide-step-2.png",
      "guide-step-3.png",
      "guide-step-4.png",
      "guide-step-5.png",
      "payment-methods.png",
    ];

    for (const asset of requiredAssets) {
      expect(existsSync(join(process.cwd(), "public/design-assets", asset)), asset).toBe(true);
    }
  });
});
