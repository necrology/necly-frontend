import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("security headers", () => {
  it("allows the Cloudflare Web Analytics script and beacon endpoint", () => {
    expect(config).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com");
    expect(config).toContain("https://cloudflareinsights.com");
  });

  it("allows every API path on the configured origin", () => {
    expect(config).toContain('from "./src/lib/api-base"');
    expect(config).toContain("apiOrigin(process.env.NEXT_PUBLIC_API_URL)");
    expect(config).toContain("`connect-src 'self' ${apiOriginValue}");
    expect(config).not.toContain("`connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL");
  });
});
