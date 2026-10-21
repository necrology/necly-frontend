import { expect, test, type Page } from "@playwright/test";

// Targeted W1 browser gate. These assertions protect the public shell and the
// existing routes without asserting a redesign or coupling to W6 API changes.

async function measureAboutCta(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const flow = rect(".about-flow-section");
    const eyebrow = rect(".about-cta-section .eyebrow");
    const heading = rect(".about-cta-section .h2");
    const button = rect(".about-cta-section .button");
    const footer = rect(".commerce-footer");
    if (!flow || !eyebrow || !heading || !button || !footer) return null;
    return {
      top: Math.round(eyebrow.top - flow.bottom),
      headingToButton: Math.round(button.top - heading.bottom),
      bottom: Math.round(footer.top - button.bottom),
    };
  });
}

test("home renders the public storefront shell", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("Premium");
  await expect(page.locator("header.site-header")).toBeVisible();
  await expect(page.getByRole("link", { name: "Layanan" }).first()).toBeVisible();
});

test("mobile hero keeps the animation close to the title block", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const gap = await page.evaluate(() => {
    const cta = document.querySelector(".commerce-hero-cta")?.getBoundingClientRect();
    const art = document.querySelector(".commerce-home-hero-art")?.getBoundingClientRect();
    if (!cta || !art) return null;
    return Math.round(art.top - cta.bottom);
  });
  expect(gap).not.toBeNull();
  expect(gap).toBeGreaterThanOrEqual(4);
  expect(gap).toBeLessThanOrEqual(16);
});

test("catalog route renders the existing search and category controls", async ({ page }) => {
  const response = await page.goto("/products");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Produk");
  await expect(page.getByRole("searchbox", { name: "Cari Produk" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Pilih kategori" })).toBeVisible();
});

test("cart route responds with the existing empty state", async ({ page }) => {
  const response = await page.goto("/cart");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Keranjang belanja");
});

test("about CTA keeps compact vertical spacing on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about", { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: "Jelajahi produk" })).toBeVisible();
  const gaps = await measureAboutCta(page);
  expect(gaps).not.toBeNull();
  expect(gaps!.top).toBeGreaterThanOrEqual(16);
  expect(gaps!.top).toBeLessThanOrEqual(40);
  expect(gaps!.headingToButton).toBeGreaterThanOrEqual(8);
  expect(gaps!.headingToButton).toBeLessThanOrEqual(24);
  expect(gaps!.bottom).toBeGreaterThanOrEqual(16);
  expect(gaps!.bottom).toBeLessThanOrEqual(40);
});

test("about CTA keeps compact vertical spacing on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/about", { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: "Jelajahi produk" })).toBeVisible();
  const gaps = await measureAboutCta(page);
  expect(gaps).not.toBeNull();
  expect(gaps!.top).toBeGreaterThanOrEqual(24);
  expect(gaps!.top).toBeLessThanOrEqual(48);
  expect(gaps!.bottom).toBeGreaterThanOrEqual(24);
  expect(gaps!.bottom).toBeLessThanOrEqual(48);
});
