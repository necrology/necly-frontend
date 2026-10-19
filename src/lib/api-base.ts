/**
 * Satu-satunya sumber default origin API.
 *
 * Dipakai oleh `src/lib/api.ts` (bundle klien) dan `next.config.ts` (CSP
 * `connect-src`) agar origin API selalu identik walaupun `NEXT_PUBLIC_API_URL`
 * tidak diset saat build. Sebelumnya keduanya punya fallback berbeda
 * (API client `http://localhost:8080`, CSP `http://localhost:8081`) sehingga
 * Chromium memblokir request sebelum route mock Playwright melihatnya.
 */
export const DEFAULT_API_URL = "http://localhost:8080/api/v1";

/** Normalkan base API agar selalu berakhir dengan `/api/v1`. */
export function normalizeApiBase(raw: string | undefined | null): string {
  const base = (raw ?? "").trim() || DEFAULT_API_URL;
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

/** Origin yang harus diizinkan CSP `connect-src` untuk base API ini. */
export function apiOrigin(raw: string | undefined | null): string {
  return new URL(normalizeApiBase(raw)).origin;
}
