import { expect, test } from "@playwright/test";

// Targeted W1 browser gate. These assertions protect the public shell and the
// existing routes without asserting a redesign or coupling to W6 API changes.
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
