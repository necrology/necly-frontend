/**
 * Origin API E2E. Nilai ini dipakai di dua tempat agar tidak pernah berbeda:
 *
 * - `playwright.config.ts` menyuntikkannya sebagai `NEXT_PUBLIC_API_URL` pada
 *   build + web server yang dijalankan Playwright, sehingga bundle klien dan
 *   CSP `connect-src` selalu memakai origin yang sama.
 * - `e2e/order-history.spec.ts` memverifikasi header CSP hasil build benar-benar
 *   mengizinkan origin ini sebelum route mock dianggap valid.
 *
 * Backend tetap dimock sepenuhnya di browser; origin ini tidak pernah diakses.
 */
export const E2E_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:58080/api/v1";

export const E2E_API_ORIGIN = new URL(E2E_API_URL).origin;
