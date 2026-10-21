import { expect, test, type Page, type Route } from "@playwright/test";

// NEC-92: panduan pada card "Ubah kata sandi" tidak boleh memecah kata
// "mengonfirmasi." ke baris berikutnya. Backend dimock penuh di browser.
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

async function hintLines(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const element = document.querySelector(".account-password-hint");
    if (!element) return null;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const lines: string[] = [];
    let current = "";
    let currentTop: number | null = null;
    const pushLine = () => {
      const line = current.trim();
      if (line) lines.push(line);
      current = "";
    };
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? "";
      const words = text.split(/(\s+)/);
      let offset = 0;
      for (const word of words) {
        if (!word) continue;
        range.setStart(node, offset);
        range.setEnd(node, offset + word.length);
        const rect = range.getClientRects()[0];
        if (rect && rect.width > 0) {
          if (currentTop === null) currentTop = rect.top;
          if (Math.abs(rect.top - currentTop) > 1) {
            pushLine();
            currentTop = rect.top;
          }
          current += word;
        } else if (word.trim() === "") {
          current += word;
        }
        offset += word.length;
      }
      // Batas node teks (mis. <br />) memaksa baris baru secara visual.
      if (text.trim()) {
        pushLine();
        currentTop = null;
      }
    }
    pushLine();
    return lines;
  });
}

test("panduan ubah kata sandi tetap utuh di baris awal pada mobile", async ({ page }) => {
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
  await page.route("**/api/v1/auth/sessions", (route) =>
    fulfillJson(route, 200, { sessions: [] }),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login?redirect=%2Fakun");
  await page.getByLabel("Alamat email").fill(user.email);
  await page.locator('input[name="password"]').fill("rahasia-aman");
  await page.getByRole("button", { name: /^Masuk/ }).click();

  await expect(page).toHaveURL(/\/akun$/);
  const hint = page.locator(".account-password-hint");
  await expect(hint).toBeVisible();

  const fullText =
    "Masukkan kata sandi Anda saat ini untuk mengonfirmasi. Setelah tersimpan, semua perangkat lain akan keluar otomatis.";

  for (const width of [390, 375, 360]) {
    await page.setViewportSize({ width, height: 844 });
    const lines = await hintLines(page);
    expect(lines, `paragraf panduan harus ter-render pada ${width}px`).not.toBeNull();
    expect(lines!.join(" "), `teks tidak boleh hilang pada ${width}px`).toBe(fullText);
    expect(lines![0], `kalimat pertama harus utuh pada ${width}px`).toBe(
      "Masukkan kata sandi Anda saat ini untuk mengonfirmasi.",
    );
    expect(lines![1], `kalimat kedua harus mulai di baris berikutnya pada ${width}px`).toMatch(
      /^Setelah tersimpan, semua perangkat lain/,
    );
  }
});
