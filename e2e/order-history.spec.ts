import { expect, test, type Route } from "@playwright/test";

function corsHeaders(route: Route) {
  return {
    "access-control-allow-origin": route.request().headers().origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,idempotency-key",
    vary: "Origin",
  };
}

async function fulfillJson(route: Route, status: number, payload: unknown) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders(route) });
    return;
  }
  await route.fulfill({
    status,
    headers: { ...corsHeaders(route), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Alur W12 dengan backend dimock di browser. Test ini tidak menyentuh API
 * sungguhan, sehingga aman dijalankan di CI tanpa database atau kredensial.
 */
test("login lalu membuka riwayat pesanan milik pengguna", async ({ page }) => {
  const orderId = "0192f0b0-0000-0000-0000-000000000001";
  const user = {
    id: "usr-e2e",
    email: "pelanggan@example.id",
    name: "Pelanggan E2E",
    role: "customer",
    email_verified_at: "2026-10-01T00:00:00Z",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  await page.route("**/api/v1/auth/refresh", (route) =>
    fulfillJson(route, 401, { error: "Sesi tidak ditemukan" }),
  );

  await page.route("**/api/v1/auth/login", (route) =>
    fulfillJson(route, 200, { user, access_token: "e2e-access-token", expires_in: 900 }),
  );

  await page.route("**/api/v1/orders?*", (route) =>
    fulfillJson(route, 200, {
      orders: [
        {
          id: orderId,
          number: "ORD-E2E-1",
          status: "paid",
          subtotal: 186_000,
          discount: 0,
          total: 186_000,
          currency: "IDR",
          payment_due_at: "2026-10-19T10:15:00Z",
          created_at: "2026-10-19T10:00:00Z",
          updated_at: "2026-10-19T10:05:00Z",
          items: [
            {
              id: "item-e2e-1",
              product_price_id: "0192f0a4-0000-0000-0000-000000000001",
              product_name: "Netflix Premium",
              duration_name: "1 Bulan",
              unit_price: 186_000,
              quantity: 1,
              device_count: 1,
              line_total: 186_000,
            },
          ],
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    }),
  );

  await page.goto("/login?redirect=%2Forders");
  await page.getByLabel("Alamat email").fill(user.email);
  await page.locator('input[name="password"]').fill("rahasia-aman");
  await page.getByRole("button", { name: /^Masuk/ }).click();

  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByRole("heading", { name: "Riwayat pesanan" })).toBeVisible();
  await expect(page.getByText("ORD-E2E-1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Lihat detail pesanan ORD-E2E-1" })).toHaveAttribute(
    "href",
    `/orders/${orderId}`,
  );
});
