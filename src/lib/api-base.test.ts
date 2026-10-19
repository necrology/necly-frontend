import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_API_URL, apiOrigin, normalizeApiBase } from "./api-base";

describe("api base konsisten dengan CSP", () => {
  it("memakai satu default origin yang sama saat env kosong", () => {
    expect(normalizeApiBase(undefined)).toBe(DEFAULT_API_URL);
    expect(apiOrigin(undefined)).toBe(new URL(DEFAULT_API_URL).origin);
  });

  it("menormalkan origin polos, path, dan trailing slash", () => {
    expect(normalizeApiBase("https://api.example.id")).toBe("https://api.example.id/api/v1");
    expect(normalizeApiBase("https://api.example.id/api/v1/")).toBe("https://api.example.id/api/v1");
    expect(apiOrigin("http://localhost:58080/api/v1")).toBe("http://localhost:58080");
  });

  it("membuat API client dan next.config memakai helper yang sama", () => {
    const apiClient = readFileSync(join(process.cwd(), "src", "lib", "api.ts"), "utf8");
    const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(apiClient).toContain('from "./api-base"');
    expect(nextConfig).toContain('from "./src/lib/api-base"');
    // Tidak ada fallback origin kedua yang tersisa di kedua berkas.
    expect(apiClient).not.toContain("http://localhost:8081");
    expect(nextConfig).not.toContain("http://localhost:8081");
  });
});
