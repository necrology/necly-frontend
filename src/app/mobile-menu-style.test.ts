import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "storefront-fixes.css"), "utf8");

describe("mobile navigation visibility", () => {
  it("does not clip the absolutely positioned menu below the rounded header", () => {
    expect(css).toContain(".site-header { overflow: visible;");
    expect(css).toContain(".commerce-mobile-nav { overflow: hidden; border-radius: 0 0 26px 26px;");
  });

  it("menyamakan lebar, shape, dan teks hitam seluruh aksi autentikasi burger", () => {
    const globals = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const header = readFileSync(join(process.cwd(), "src", "components", "site-header.tsx"), "utf8");

    expect(globals).toMatch(/\.commerce-mobile-auth-action \{[^}]*width: 100%;[^}]*max-width: 220px;[^}]*border-radius: 10px;[^}]*color: #000;/);
    expect(header.match(/commerce-mobile-auth-action/g)).toHaveLength(3);
    expect(header).toContain("Akun &amp; keamanan");
    expect(header).toContain("Keluar (");
    expect(header).toContain(">Log In</Link>");
  });
});
