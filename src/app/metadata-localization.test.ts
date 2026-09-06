import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("root metadata localization", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");

  it("declares Indonesian document language and skip link", () => {
    expect(source).toContain('<html lang="id">');
    expect(source).toContain("Lewati ke konten utama");
  });

  it("describes the Necly subscription marketplace", () => {
    expect(source).toContain("Solusi hemat berlangganan akun premium");
    expect(source).toContain('locale: "id_ID"');
    expect(source).not.toContain("Work, expertly handled");
  });
});
