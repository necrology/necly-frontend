import { expect, test, type Route } from "@playwright/test";
import { E2E_API_ORIGIN } from "./support/env";

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

const admin = {
  id: "usr-admin-e2e",
  email: "admin@example.id",
  name: "Admin E2E",
  role: "admin",
  email_verified_at: "2026-10-01T00:00:00Z",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

/**
 * NEC-136: menu SearchableSelect di dalam modal sempat tertutup backdrop
 * (`.modal-overlay` z-index 200, menu 90). Test ini memastikan daftar opsi
 * benar-benar terlihat dan menerima klik, bukan hanya ada di DOM.
 */
test("select kategori menampilkan daftar di atas backdrop modal produk", async ({ page }) => {
  await page.route(`${E2E_API_ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith("/auth/refresh")) {
      return fulfillJson(route, 200, { user: admin, access_token: "e2e-access-token", expires_in: 900 });
    }
    if (url.pathname.endsWith("/auth/sessions")) {
      return fulfillJson(route, 200, { sessions: [] });
    }
    if (url.pathname.endsWith("/admin/products")) {
      return fulfillJson(route, 200, { products: [], page: 1, per_page: 100, total: 0 });
    }
    if (url.pathname.endsWith("/admin/categories")) {
      return fulfillJson(route, 200, {
        categories: [
          { id: "cat-streaming", name: "Streaming", active: true },
          { id: "cat-produktivitas", name: "Produktivitas", active: true },
        ],
        page: 1,
        per_page: 100,
        total: 2,
      });
    }
    if (url.pathname.endsWith("/admin/product-durations")) {
      return fulfillJson(route, 200, {
        durations: [
          { id: "dur-1-bulan", name: "1 Bulan", days: 30 },
          { id: "dur-3-bulan", name: "3 Bulan", days: 90 },
          { id: "dur-6-bulan", name: "6 Bulan", days: 180 },
          { id: "dur-12-bulan", name: "12 Bulan", days: 365 },
        ],
      });
    }
    return fulfillJson(route, 404, { error: `Endpoint belum dimock: ${url.pathname}` });
  });

  await page.goto("/dashboard/products");
  await expect(page.getByRole("heading", { name: "Produk akun sharing" })).toBeVisible();

  await page.getByRole("button", { name: "Tambah produk" }).click();
  const dialog = page.getByRole("dialog", { name: "Produk baru" });
  await expect(dialog).toBeVisible();

  const input = dialog.getByLabel("Kategori");
  await input.click();

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole("option", { name: "Streaming" })).toBeVisible();

  // Titik tengah menu harus milik menu/opsinya sendiri, bukan elemen lain yang
  // menutupinya (mis. backdrop modal atau topbar).
  const box = await listbox.boundingBox();
  expect(box).not.toBeNull();
  const topmostIsMenu = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return Boolean(element?.closest(".necly-select__menu"));
  }, { x: (box?.x ?? 0) + 4, y: (box?.y ?? 0) + 4 });
  expect(topmostIsMenu).toBe(true);

  await listbox.getByRole("option", { name: "Streaming" }).click();
  await expect(dialog.getByText("Streaming", { exact: true })).toBeVisible();
});
