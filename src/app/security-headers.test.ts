import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("security headers", () => {
  it("allows the Cloudflare Web Analytics script and beacon endpoint", () => {
    expect(config).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com");
    expect(config).toContain("https://cloudflareinsights.com");
  });
});
